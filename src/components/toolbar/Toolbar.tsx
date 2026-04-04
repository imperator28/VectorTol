import { useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { serializeProject, deserializeProject, rowsToCsv } from '../../utils/fileIO';
import { getStageDataUrl } from '../../utils/stageRef';
import { exportPdf } from '../../utils/pdfExport';
import { exportXlsx } from '../../utils/xlsxExport';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

function browserDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Toolbar() {
  const metadata = useProjectStore((s) => s.metadata);
  const rows = useProjectStore((s) => s.rows);
  const target = useProjectStore((s) => s.target);
  const canvasData = useProjectStore((s) => s.canvasData);
  const isDirty = useProjectStore((s) => s.isDirty);
  const results = useProjectStore((s) => s.results);
  const derivedRows = useProjectStore((s) => s.derivedRows);
  const addRow = useProjectStore((s) => s.addRow);
  const removeRow = useProjectStore((s) => s.removeRow);
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);
  const markClean = useProjectStore((s) => s.markClean);
  const setMetadata = useProjectStore((s) => s.setMetadata);
  const selectedRowId = useUiStore((s) => s.selectedRowId);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    newProject();
  }, [isDirty, newProject]);

  const handleOpen = useCallback(async () => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    if (isTauri) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const { readTextFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await open({
          filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
        });
        if (!filePath) return;
        const content = await readTextFile(filePath as string);
        const file = deserializeProject(content);
        loadProject(file.metadata, file.gridData, file.metadata.designIntent, filePath as string, file.canvasData);
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.vtol';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = deserializeProject(reader.result as string);
            loadProject(parsed.metadata, parsed.gridData, parsed.metadata.designIntent, null, parsed.canvasData);
          } catch (err) {
            console.error('Failed to parse file:', err);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  }, [isDirty, loadProject]);

  const handleSave = useCallback(async () => {
    const json = serializeProject(metadata, rows, target, canvasData);
    if (isTauri) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await save({
          filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
          defaultPath: `${metadata.projectName}.vtol`,
        });
        if (!filePath) return;
        await writeTextFile(filePath, json);
        markClean();
      } catch (err) {
        console.error('Failed to save file:', err);
      }
    } else {
      browserDownload(json, `${metadata.projectName}.vtol`, 'application/json');
      markClean();
    }
  }, [metadata, rows, target, canvasData, markClean]);

  const handleExportCsv = useCallback(async () => {
    const csv = rowsToCsv(rows);
    if (isTauri) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await save({
          filters: [{ name: 'CSV', extensions: ['csv'] }],
          defaultPath: `${metadata.projectName}.csv`,
        });
        if (!filePath) return;
        await writeTextFile(filePath, csv);
      } catch (err) {
        console.error('Failed to export CSV:', err);
      }
    } else {
      browserDownload(csv, `${metadata.projectName}.csv`, 'text/csv');
    }
  }, [metadata, rows]);

  const handleDeleteRow = useCallback(() => {
    if (selectedRowId) removeRow(selectedRowId);
  }, [selectedRowId, removeRow]);

  const handleExportPdf = useCallback(async () => {
    const canvasDataUrl = getStageDataUrl();
    await exportPdf(metadata, rows, target, results, derivedRows, canvasDataUrl);
  }, [metadata, rows, target, results, derivedRows]);

  const handleExportXlsx = useCallback(() => {
    exportXlsx(rows, derivedRows, results, metadata.projectName);
  }, [rows, derivedRows, results, metadata.projectName]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={handleNew} title="New Project">New</button>
        <button onClick={handleOpen} title="Open .vtol file">Open</button>
        <button onClick={handleSave} title="Save as .vtol file">Save{isDirty ? ' *' : ''}</button>
      </div>
      <div className="toolbar-group">
        <button onClick={addRow} title="Add Row">+ Row</button>
        <button onClick={handleDeleteRow} title="Delete Selected Row">- Row</button>
      </div>
      <div className="toolbar-group">
        <button onClick={handleExportPdf} title="Export PDF Report">PDF</button>
        <button onClick={handleExportXlsx} title="Export Excel">XLSX</button>
        <button onClick={handleExportCsv} title="Export CSV">CSV</button>
      </div>
      <div className="toolbar-meta">
        <input
          className="toolbar-meta-input"
          value={metadata.projectName}
          onChange={(e) => setMetadata({ projectName: e.target.value })}
          placeholder="Project name"
          title="Project name"
        />
        <input
          className="toolbar-meta-input toolbar-meta-author"
          value={metadata.author}
          onChange={(e) => setMetadata({ author: e.target.value })}
          placeholder="Author"
          title="Author"
        />
        {isDirty && <span className="toolbar-dirty">unsaved</span>}
      </div>
    </div>
  );
}
