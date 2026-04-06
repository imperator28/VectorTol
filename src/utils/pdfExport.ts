import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { StackRow, RowId } from '../types/grid';
import type { VtolMetadata, TargetScenario } from '../types/project';
import type { AnalysisResults, DerivedRowData } from '../store/projectStore';

function fmtTarget(target: TargetScenario): string {
  const type = target.type.charAt(0).toUpperCase() + target.type.slice(1);
  const parts: string[] = [type];
  if (target.minGap !== null) parts.push(`Min: ${target.minGap}`);
  if (target.maxGap !== null) parts.push(`Max: ${target.maxGap}`);
  return parts.join('  |  ');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export async function exportPdf(
  metadata: VtolMetadata,
  rows: StackRow[],
  target: TargetScenario,
  results: AnalysisResults,
  derivedRows: Map<RowId, DerivedRowData>,
  canvasDataUrl: string | null,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  // ── Title block ──────────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('VectorTol — Tolerance Stack-Up Report', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Project: ${metadata.projectName}`, margin, y);
  doc.text(`Author: ${metadata.author || '—'}`, margin + 80, y);
  doc.text(`Date: ${fmtDate(metadata.updatedAt)}`, margin + 160, y);
  y += 5;
  doc.text(`Design Intent: ${fmtTarget(target)}`, margin, y);
  y += 6;

  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, W - margin, y);
  y += 5;

  // ── Canvas image ─────────────────────────────────────────────────────────
  if (canvasDataUrl) {
    const maxH = 60;
    const maxW = W - margin * 2;
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        const imgW = Math.min(maxW, maxH * ratio);
        const imgH = imgW / ratio;
        doc.addImage(canvasDataUrl, 'PNG', margin, y, imgW, imgH);
        y += imgH + 5;
        resolve();
      };
      img.onerror = () => resolve(); // skip image if load fails
      img.src = canvasDataUrl;
    });
  }

  // ── Data table ───────────────────────────────────────────────────────────
  const tableRows = rows.map((row, i) => {
    const derived = derivedRows.get(row.id);
    return [
      String(i + 1),
      row.component,
      row.dimId,
      row.toleranceSource,
      row.direction === 1 ? '+' : '−',
      row.nominal,
      row.tolSymmetric ?? '',
      row.tolPlus ?? '',
      row.tolMinus ?? '',
      derived ? derived.centeredNominal.toDecimalPlaces(4).toString() : '',
      derived ? derived.centeredTolerance.toDecimalPlaces(4).toString() : '',
      derived ? `${derived.percentContribution.toFixed(1)}%` : '',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Component', 'Dim ID', 'Tol Source', '+/−', 'Nominal', '±TOL', '+TOL', '−TOL', 'Ctr Nom', 'Ctr TOL', '% Contrib']],
    body: tableRows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 14, halign: 'right' },
      7: { cellWidth: 14, halign: 'right' },
      8: { cellWidth: 14, halign: 'right' },
      9: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      10: { cellWidth: 18, halign: 'right' },
      11: { cellWidth: 18, halign: 'right' },
    },
    didParseCell: (data) => {
      // Flag % Contrib > 25% in red
      if (data.section === 'body' && data.column.index === 11) {
        const val = parseFloat(data.cell.raw as string);
        if (val > 25) {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // Start new page if not enough room
  if (y > doc.internal.pageSize.getHeight() - 45) {
    doc.addPage();
    y = margin;
  }

  // ── Results summary ──────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Analysis Results', margin, y);
  y += 6;

  const wcPass = results.wcPass;
  const rssPass = results.rssPass;

  autoTable(doc, {
    startY: y,
    head: [['', 'Tolerance', 'Min', 'Max', 'Status']],
    body: [
      [
        'Worst Case',
        results.wcTolerance.toDecimalPlaces(4).toString(),
        results.wcMin.toDecimalPlaces(4).toString(),
        results.wcMax.toDecimalPlaces(4).toString(),
        wcPass ? 'PASS' : 'FAIL',
      ],
      [
        'RSS',
        results.rssTolerance.toDecimalPlaces(4).toString(),
        results.rssMin.toDecimalPlaces(4).toString(),
        results.rssMax.toDecimalPlaces(4).toString(),
        rssPass ? 'PASS' : 'FAIL',
      ],
    ],
    styles: { fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { halign: 'right', cellWidth: 26 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const isPass = data.cell.raw === 'PASS';
        data.cell.styles.textColor = isPass ? [22, 101, 52] : [153, 27, 27];
        data.cell.styles.fillColor = isPass ? [220, 252, 231] : [254, 226, 226];
      }
    },
    margin: { left: margin, right: margin },
    tableWidth: 126,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  // Failure rate
  const fr = results.rssFailureRate;
  const frStr = fr === 0 ? '0 ppm' : fr < 0.000001 ? `${(fr * 1e6).toFixed(2)} ppm` : `${(fr * 100).toFixed(4)}%`;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Gap (nominal): ${results.gap.toDecimalPlaces(4).toString()}   RSS Failure Rate: ${frStr}   Yield: ${results.rssYieldPercent.toFixed(4)}%`, margin, y);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `VectorTol  |  ${metadata.projectName}  |  Page ${p} of ${pageCount}`,
      W / 2,
      doc.internal.pageSize.getHeight() - 6,
      { align: 'center' },
    );
  }

  doc.save(`${metadata.projectName || 'Untitled'}_report.pdf`);
}
