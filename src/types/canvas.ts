import type { RowId } from './grid';

export interface CanvasVector {
  id: RowId;         // Matches StackRow.id
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
}

export interface ImageTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface CanvasData {
  vectors: CanvasVector[];
  image: string | null;          // Base64-encoded PNG/JPG
  imageTransform: ImageTransform;
}

export const DEFAULT_CANVAS_DATA: CanvasData = {
  vectors: [],
  image: null,
  imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
};

export type CanvasTool = 'select' | 'draw';
