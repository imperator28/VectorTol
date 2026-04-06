import type Konva from 'konva';

/** Module-level singleton so Toolbar can capture the canvas without prop drilling */
let _stage: Konva.Stage | null = null;

export function setStageRef(stage: Konva.Stage | null): void {
  _stage = stage;
}

/** Returns a data URL of the current canvas at 2× pixel ratio, or null if no stage. */
export function getStageDataUrl(): string | null {
  return _stage ? _stage.toDataURL({ pixelRatio: 2 }) : null;
}

/** Compute ImageTransform to fit an image (naturalW x naturalH) into the current stage size */
export function computeFitTransform(naturalW: number, naturalH: number): { x: number; y: number; scale: number } | null {
  const stage = _stage;
  if (!stage) return null;
  const sw = stage.width();
  const sh = stage.height();
  const scaleX = sw / naturalW;
  const scaleY = sh / naturalH;
  const scale = Math.min(scaleX, scaleY) * 0.95; // 5% margin
  const x = (sw - naturalW * scale) / 2;
  const y = (sh - naturalH * scale) / 2;
  return { x, y, scale };
}
