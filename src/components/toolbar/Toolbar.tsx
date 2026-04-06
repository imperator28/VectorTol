import { useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useTutorialStore } from '../../store/tutorialStore';
import { serializeProject, deserializeProject, rowsToCsv } from '../../utils/fileIO';
import { clearAutosaveDraft, saveAutosaveDraft } from '../../utils/autosave';
import { getStageDataUrl } from '../../utils/stageRef';
import { exportPdf } from '../../utils/pdfExport';
import { exportXlsx } from '../../utils/xlsxExport';
import type { VtolMetadata } from '../../types/project';
import { Icon } from '../ui/Icon';
import { Tooltip } from '../ui/Tooltip';
import { FileActionModal, type FileActionReviewValues } from '../ui/FileActionModal';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
type FileAction = 'project' | 'pdf' | 'xlsx' | 'csv';

function browserDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getActionFileName(projectName: string, action: FileAction | null): string {
  const baseName = projectName.trim() || 'Untitled';
  switch (action) {
    case 'project':
      return `${baseName}.vtol`;
    case 'pdf':
      return `${baseName}_report.pdf`;
    case 'xlsx':
      return `${baseName}.xlsx`;
    case 'csv':
      return `${baseName}.csv`;
    default:
      return '';
  }
}

export function Toolbar() {
  const metadata = useProjectStore((s) => s.metadata);
  const rows = useProjectStore((s) => s.rows);
  const target = useProjectStore((s) => s.target);
  const canvasData = useProjectStore((s) => s.canvasData);
  const isDirty = useProjectStore((s) => s.isDirty);
  const currentFilePath = useProjectStore((s) => s.currentFilePath);
  const results = useProjectStore((s) => s.results);
  const derivedRows = useProjectStore((s) => s.derivedRows);
  const addRow = useProjectStore((s) => s.addRow);
  const removeRow = useProjectStore((s) => s.removeRow);
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);
  const markClean = useProjectStore((s) => s.markClean);
  const setMetadata = useProjectStore((s) => s.setMetadata);
  const setFilePath = useProjectStore((s) => s.setFilePath);
  const selectedRowId = useUiStore((s) => s.selectedRowId);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const startTutorial = useTutorialStore((s) => s.start);
  const autosaveEnabled = useSettingsStore((s) => s.autosaveEnabled);
  const autosaveIntervalMinutes = useSettingsStore((s) => s.autosaveIntervalMinutes);
  const setAutosaveEnabled = useSettingsStore((s) => s.setAutosaveEnabled);
  const setAutosaveIntervalMinutes = useSettingsStore((s) => s.setAutosaveIntervalMinutes);
  const [pendingAction, setPendingAction] = useState<FileAction | null>(null);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    clearAutosaveDraft();
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
        clearAutosaveDraft();
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
            clearAutosaveDraft();
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

  const saveProjectFile = useCallback(async (nextMetadata: VtolMetadata) => {
    const json = serializeProject(nextMetadata, rows, target, canvasData);
    const baseName = nextMetadata.projectName.trim() || 'Untitled';
    if (isTauri) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await save({
          filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
          defaultPath: `${baseName}.vtol`,
        });
        if (!filePath) return false;
        await writeTextFile(filePath, json);
        setFilePath(filePath as string);
        markClean();
        clearAutosaveDraft();
        return true;
      } catch (err) {
        console.error('Failed to save file:', err);
        return false;
      }
    } else {
      browserDownload(json, `${baseName}.vtol`, 'application/json');
      markClean();
      clearAutosaveDraft();
      return true;
    }
  }, [rows, target, canvasData, markClean, setFilePath]);

  const exportCsvFile = useCallback(async (projectName: string) => {
    const csv = rowsToCsv(rows);
    const baseName = projectName.trim() || 'Untitled';
    if (isTauri) {
      try {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        const filePath = await save({
          filters: [{ name: 'CSV', extensions: ['csv'] }],
          defaultPath: `${baseName}.csv`,
        });
        if (!filePath) return;
        await writeTextFile(filePath, csv);
      } catch (err) {
        console.error('Failed to export CSV:', err);
      }
    } else {
      browserDownload(csv, `${baseName}.csv`, 'text/csv');
    }
  }, [rows]);

  const handleDeleteRow = useCallback(() => {
    if (selectedRowId) removeRow(selectedRowId);
  }, [selectedRowId, removeRow]);

  const exportPdfFile = useCallback(async (nextMetadata: VtolMetadata) => {
    const canvasDataUrl = getStageDataUrl();
    await exportPdf(
      nextMetadata,
      rows,
      target,
      results,
      derivedRows,
      canvasDataUrl,
    );
  }, [rows, target, results, derivedRows]);

  const exportXlsxFile = useCallback((projectName: string) => {
    exportXlsx(rows, derivedRows, results, projectName.trim() || 'Untitled');
  }, [rows, derivedRows, results]);

  const runAutosave = useCallback(async () => {
    if (!isDirty) return;

    const json = serializeProject(metadata, rows, target, canvasData);
    if (isTauri && currentFilePath) {
      try {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        await writeTextFile(currentFilePath, json);
        return;
      } catch (err) {
        console.warn('Autosave to project path failed; falling back to local draft.', err);
      }
    }

    try {
      saveAutosaveDraft(metadata, rows, target, canvasData, currentFilePath);
    } catch (err) {
      console.warn('Autosave draft failed.', err);
    }
  }, [canvasData, currentFilePath, isDirty, metadata, rows, target]);

  useEffect(() => {
    if (!autosaveEnabled || !isDirty) return;
    const intervalMs = autosaveIntervalMinutes * 60_000;
    const timer = window.setInterval(() => {
      void runAutosave();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [autosaveEnabled, autosaveIntervalMinutes, isDirty, runAutosave]);

  const confirmPendingAction = useCallback(async (reviewValues: FileActionReviewValues) => {
    const action = pendingAction;
    setPendingAction(null);
    if (!action) return;

    const nextMetadata: VtolMetadata = {
      ...metadata,
      projectName: reviewValues.projectName,
      author: reviewValues.author,
      updatedAt: reviewValues.updatedAt,
    };

    if (
      nextMetadata.projectName !== metadata.projectName ||
      nextMetadata.author !== metadata.author ||
      nextMetadata.updatedAt !== metadata.updatedAt
    ) {
      setMetadata({
        projectName: nextMetadata.projectName,
        author: nextMetadata.author,
        updatedAt: nextMetadata.updatedAt,
      });
    }

    switch (action) {
      case 'project':
        await saveProjectFile(nextMetadata);
        break;
      case 'pdf':
        await exportPdfFile(nextMetadata);
        break;
      case 'xlsx':
        exportXlsxFile(nextMetadata.projectName);
        break;
      case 'csv':
        await exportCsvFile(nextMetadata.projectName);
        break;
    }
  }, [exportCsvFile, exportPdfFile, exportXlsxFile, metadata, pendingAction, saveProjectFile, setMetadata]);

  const pendingActionLabel =
    pendingAction === 'project' ? 'Save Project' :
    pendingAction === 'pdf' ? 'Export PDF' :
    pendingAction === 'xlsx' ? 'Export XLSX' :
    pendingAction === 'csv' ? 'Export CSV' :
    '';

  const pendingFileLabel =
    pendingAction === 'project' ? 'Project File' :
    pendingAction === 'pdf' ? 'PDF Report' :
    pendingAction === 'xlsx' ? 'Excel Workbook' :
    pendingAction === 'csv' ? 'CSV Export' :
    '';

  return (
    <>
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
          <Tooltip content="Review the file metadata, then save the current project as a .vtol file." placement="bottom">
            <button onClick={() => setPendingAction('project')}>
              <Icon name="save" size={14} /> Save{isDirty ? ' *' : ''}
            </button>
          </Tooltip>
        </div>
        <div className="toolbar-group">
          <Tooltip content="Add a new dimension row to the stack-up." placement="bottom">
            <button onClick={addRow} data-tour="add-row-button">
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
          <Tooltip content="Review the file metadata, then export a PDF report with title block, annotated canvas, data table, and WC/RSS results." placement="bottom">
            <button onClick={() => setPendingAction('pdf')}>
              <Icon name="file-pdf" size={14} /> PDF
            </button>
          </Tooltip>
          <Tooltip content="Review the file metadata, then export an Excel workbook with all grid columns and analysis results." placement="bottom">
            <button onClick={() => setPendingAction('xlsx')}>
              <Icon name="file-table" size={14} /> XLSX
            </button>
          </Tooltip>
          <Tooltip content="Review the file metadata, then export raw stack-up data as a CSV file." placement="bottom">
            <button onClick={() => setPendingAction('csv')}>
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
          <label className="autosave-toggle" title="Toggle automatic draft saving">
            <input
              type="checkbox"
              checked={autosaveEnabled}
              onChange={(e) => setAutosaveEnabled(e.target.checked)}
            />
            <span className="autosave-toggle-track">
              <span className="autosave-toggle-thumb" />
            </span>
            <span className="autosave-toggle-label">Auto-save</span>
          </label>
          <label className="autosave-interval" title="How often auto-save runs, in minutes">
            <span>every</span>
            <input
              type="number"
              min={1}
              max={60}
              value={autosaveIntervalMinutes}
              onChange={(e) => setAutosaveIntervalMinutes(Number(e.target.value) || 1)}
              disabled={!autosaveEnabled}
            />
            <span>min</span>
          </label>
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
      {pendingAction && (
        <FileActionModal
          actionLabel={pendingActionLabel}
          fileLabel={pendingFileLabel}
          metadata={metadata}
          getFileName={(projectName) => getActionFileName(projectName, pendingAction)}
          onCancel={() => setPendingAction(null)}
          onConfirm={(values) => { void confirmPendingAction(values); }}
        />
      )}
    </>
  );
}
