import type { StackRow } from './grid';
import type { CanvasData } from './canvas';

export type TargetType = 'clearance' | 'interference' | 'flush' | 'proud' | 'recess' | 'custom';

export interface TargetScenario {
  type: TargetType;
  minGap: string | null;
  maxGap: string | null;
}

export interface VtolMetadata {
  projectName: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  designIntent: TargetScenario;
}

export interface VtolFile {
  version: 1;
  metadata: VtolMetadata;
  gridData: StackRow[];
  canvasData: CanvasData;
  settings: Record<string, unknown>;
}
