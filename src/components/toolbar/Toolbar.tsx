import { useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { serializeProject, deserializeProject, rowsToCsv } from '../../utils/fileIO';
import { getStageDataUrl } from '../../utils/stageRef';
import { exportPdf } from '../../utils/pdfExport';
import { exportXlsx } from '../../utils/xlsxExport';

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
  const selectedRowId = useUiStore((s) => s.selectedRowId);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    newProject();
  }, [isDirty, newProject]);

  const handleOpen = useCallback(async () => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
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
  }, [isDirty, loadProject]);

  const handleSave = useCallback(async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
        defaultPath: `${metadata.projectName}.vtol`,
      });
      if (!filePath) return;
      const json = serializeProject(metadata, rows, target, canvasData);
      await writeTextFile(filePath, json);
      markClean();
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [metadata, rows, target, canvasData, markClean]);

  const handleExportCsv = useCallback(async () => {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        filters: [{ name: 'CSV', extensions: ['csv'] }],
        defaultPath: `${metadata.projectName}.csv`,
      });
      if (!filePath) return;
      const csv = rowsToCsv(rows);
      await writeTextFile(filePath, csv);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  }, [metadata, rows]);

  const handleDeleteRow = useCallback(() => {
    if (selectedRowId) removeRow(selectedRowId);
  }, [selectedRowId, removeRow]);

  const handleExportPdf = useCallback(() => {
    const canvasDataUrl = getStageDataUrl();
    exportPdf(metadata, rows, target, results, derivedRows, canvasDataUrl);
  }, [metadata, rows, target, results, derivedRows]);

  const handleExportXlsx = useCallback(() => {
    exportXlsx(rows, derivedRows, metadata.projectName);
  }, [rows, derivedRows, metadata.projectName]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={handleNew} title="New Project">New</button>
        <button onClick={handleOpen} title="Open .vtol file">Open</button>
        <button onClick={handleSave} title="Save">Save{isDirty ? ' *' : ''}</button>
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
      <div className="toolbar-info">
        <span>{metadata.projectName}{isDirty ? ' (unsaved)' : ''}</span>
      </div>
    </div>
  );
}
