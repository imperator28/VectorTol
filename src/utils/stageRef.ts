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
