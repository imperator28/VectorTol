import type { StackRow } from './grid';

export type TargetType = 'clearance' | 'interference' | 'flush' | 'proud' | 'recess';

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
  canvasData: {
    vectors: unknown[];
    image: string | null;
    imageTransform: { x: number; y: number; scale: number; rotation: number };
  };
  settings: Record<string, unknown>;
}
