import type { StackRow } from '../types/grid';
import type { VtolMetadata, TargetScenario } from '../types/project';
import type { CanvasData } from '../types/canvas';
import { deserializeProject, serializeProject } from './fileIO';

export const AUTOSAVE_DRAFT_KEY = 'vectortol-autosave-draft-v1';

interface AutosaveDraftRecord {
  currentFilePath: string | null;
  savedAt: string;
  projectJson: string;
}

export interface AutosaveDraft {
  currentFilePath: string | null;
  savedAt: string;
  metadata: VtolMetadata;
  rows: StackRow[];
  target: TargetScenario;
  canvasData: CanvasData;
}

export function saveAutosaveDraft(
  metadata: VtolMetadata,
  rows: StackRow[],
  target: TargetScenario,
  canvasData: CanvasData,
  currentFilePath: string | null,
): void {
  const savedAt = new Date().toISOString();
  const projectJson = serializeProject(
    { ...metadata, updatedAt: savedAt },
    rows,
    target,
    canvasData,
  );
  const payload: AutosaveDraftRecord = { currentFilePath, savedAt, projectJson };
  localStorage.setItem(AUTOSAVE_DRAFT_KEY, JSON.stringify(payload));
}

export function loadAutosaveDraft(): AutosaveDraft | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutosaveDraftRecord;
    const file = deserializeProject(parsed.projectJson);
    return {
      currentFilePath: parsed.currentFilePath,
      savedAt: parsed.savedAt,
      metadata: file.metadata,
      rows: file.gridData,
      target: file.metadata.designIntent,
      canvasData: file.canvasData,
    };
  } catch {
    return null;
  }
}

export function clearAutosaveDraft(): void {
  localStorage.removeItem(AUTOSAVE_DRAFT_KEY);
}
