import * as XLSX from 'xlsx';
import type { StackRow, RowId } from '../types/grid';
import type { DerivedRowData } from '../store/projectStore';

export function exportXlsx(
  rows: StackRow[],
  derivedRows: Map<RowId, DerivedRowData>,
  projectName: string,
): void {
  const headers = [
    '#', 'Component', 'Dim ID', 'Tol Source', 'Direction',
    'Nominal', '± TOL', '+TOL', '-TOL', 'Round', 'σ',
    'Ctr Nominal', 'Ctr TOL', '% Contrib',
  ];

  const data = rows.map((row, i) => {
    const derived = derivedRows.get(row.id);
    return [
      i + 1,
      row.component,
      row.dimId,
      row.toleranceSource,
      row.direction === 1 ? '+' : '-',
      row.nominal,
      row.tolSymmetric ?? '',
      row.tolPlus ?? '',
      row.tolMinus ?? '',
      row.rounding,
      row.sigma,
      derived ? derived.centeredNominal.toDecimalPlaces(4).toString() : '',
      derived ? derived.centeredTolerance.toDecimalPlaces(4).toString() : '',
      derived ? derived.percentContribution.toFixed(2) : '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Column widths
  ws['!cols'] = [
    { wch: 4 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 6 },
    { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 6 }, { wch: 6 },
    { wch: 12 }, { wch: 10 }, { wch: 10 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stack-Up');
  XLSX.writeFile(wb, `${projectName}.xlsx`);
}
