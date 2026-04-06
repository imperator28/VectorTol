import { useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore } from '../../store/themeStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { serializeProject, deserializeProject, rowsToCsv } from '../../utils/fileIO';
import { getStageDataUrl } from '../../utils/stageRef';
import { exportPdf } from '../../utils/pdfExport';
import { exportXlsx } from '../../utils/xlsxExport';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';

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
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const startTutorial = useTutorialStore((s) => s.start);

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
    <div className="toolbar" data-tour="toolbar">
      <div className="toolbar-group">
        <Tooltip content="Create a blank project. Unsaved changes will be lost." placement="bottom">
          <button onClick={handleNew}>
            <Icon name="file-plus" size={14} /> New
          </button>
        </Tooltip>
        <Tooltip content="Open a saved .vtol project file from your computer." placement="bottom">
          <button onClick={handleOpen}>
            <Icon name="folder-open" size={14} /> Open
          </button>
        </Tooltip>
        <Tooltip content="Save the current project as a .vtol file (includes canvas, grid data, and settings)." placement="bottom">
          <button onClick={handleSave}>
            <Icon name="save" size={14} /> Save{isDirty ? ' *' : ''}
          </button>
        </Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip content="Add a new dimension row to the stack-up." placement="bottom">
          <button onClick={addRow}>
            <Icon name="row-plus" size={14} /> Row
          </button>
        </Tooltip>
        <Tooltip content="Delete the currently selected row from the grid." placement="bottom">
          <button onClick={handleDeleteRow}>
            <Icon name="row-minus" size={14} /> Row
          </button>
        </Tooltip>
      </div>
      <div className="toolbar-group">
        <Tooltip content="Export a PDF report with title block, annotated canvas, data table, and WC/RSS results." placement="bottom">
          <button onClick={handleExportPdf}>
            <Icon name="file-pdf" size={14} /> PDF
          </button>
        </Tooltip>
        <Tooltip content="Export an Excel workbook with all grid columns and analysis results." placement="bottom">
          <button onClick={handleExportXlsx}>
            <Icon name="file-table" size={14} /> XLSX
          </button>
        </Tooltip>
        <Tooltip content="Export raw stack-up data as a CSV file." placement="bottom">
          <button onClick={handleExportCsv}>
            <Icon name="file-code" size={14} /> CSV
          </button>
        </Tooltip>
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
        <Tooltip content="View all keyboard shortcuts (?)" placement="bottom">
          <button className="theme-toggle" onClick={() => setShortcutsOpen(true)} title="Keyboard shortcuts">
            <Icon name="keyboard" size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Start the interactive tutorial to learn VectorTol features." placement="bottom">
          <button
            className="theme-toggle"
            onClick={startTutorial}
            title="Open tutorial"
            style={{ marginRight: 2 }}
          >
            <Icon name="help-circle" size={16} />
          </button>
        </Tooltip>
        <Tooltip
          content={
            themeMode === 'light' ? 'Switch to dark mode' :
            themeMode === 'dark' ? 'Switch to Swiss International (high-contrast) theme' :
            'Switch to light mode'
          }
          placement="bottom"
        >
          <button
            className="theme-toggle"
            onClick={toggleTheme}
          >
            <Icon
              name={
                themeMode === 'light' ? 'moon' :
                themeMode === 'dark' ? 'swiss' :
                'sun'
              }
              size={16}
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
