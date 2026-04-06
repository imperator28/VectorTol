import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Circle } from 'react-konva';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { VectorArrow } from './VectorArrow';
import { setStageRef } from '../../utils/stageRef';
import type Konva from 'konva';

const SNAP_RADIUS_PX = 16; // screen pixels within which endpoint snapping activates

/** Load an HTML Image from a data URL */
function useImage(src: string | null): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const el = new window.Image();
    el.onload = () => setImg(el);
    el.src = src;
  }, [src]);
  return img;
}

export function VisualCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Store state
  const canvasData = useProjectStore((s) => s.canvasData);
  const rows = useProjectStore((s) => s.rows);
  const addVector = useProjectStore((s) => s.addVector);
  const removeVector = useProjectStore((s) => s.removeVector);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const selectedRowId = useUiStore((s) => s.selectedRowId);
  const setSelectedRowId = useUiStore((s) => s.setSelectedRowId);
  const canvasTool = useUiStore((s) => s.canvasTool);
  const setCanvasTool = useUiStore((s) => s.setCanvasTool);
  const currentStrokeWidth = useUiStore((s) => s.currentStrokeWidth);
  const currentVectorColor = useUiStore((s) => s.currentVectorColor);
  const highlightColor = useUiStore((s) => s.highlightColor);
  const directionLock = useUiStore((s) => s.directionLock);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleDirectionLock = useUiStore((s) => s.toggleDirectionLock);
  const toggleSnap = useUiStore((s) => s.toggleSnap);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);

  // Canvas dimensions
  const [dims, setDims] = useState({ width: 600, height: 400 });
  // Pan/zoom
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  // Drawing state
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  // Snap indicator: canvas-space point that is currently snapping
  const [snapIndicator, setSnapIndicator] = useState<{ x: number; y: number } | null>(null);
  // Spacebar pan override
  const [spaceToolOverride, setSpaceToolOverride] = useState<string | null>(null);
  // Middle-button pan
  const middlePanRef = useRef<{ lastX: number; lastY: number } | null>(null);

  const bgImage = useImage(canvasData.image);
  const effectiveTool = spaceToolOverride !== null ? 'select' : canvasTool;

  // Register stage ref for PDF export
  useEffect(() => {
    setStageRef(stageRef.current);
    return () => setStageRef(null);
  }, []);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setDims({ width: Math.floor(width), height: Math.floor(height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
      }

      if (e.key === 'v' || e.key === 'V') setCanvasTool('select');
      if (e.key === 'd' || e.key === 'D') setCanvasTool('draw');
      if (e.key === 'l' || e.key === 'L') toggleDirectionLock();
      if (e.key === 's' || e.key === 'S') toggleSnap();

      if (e.key === ' ' && spaceToolOverride === null) {
        e.preventDefault();
        setSpaceToolOverride(canvasTool);
        setDrawStart(null);
        setDrawEnd(null);
        setSnapIndicator(null);
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRowId) {
        removeVector(selectedRowId);
        setSelectedRowId(null);
      }
      if (e.key === 'Escape') {
        setDrawStart(null);
        setDrawEnd(null);
        setSnapIndicator(null);
        setSelectedRowId(null);
      }
      if (e.key === '?') { e.preventDefault(); setShortcutsOpen(true); return; }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' && spaceToolOverride !== null) setSpaceToolOverride(null);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedRowId, canvasTool, spaceToolOverride, setCanvasTool, removeVector, setSelectedRowId, undo, redo, toggleDirectionLock, toggleSnap, setShortcutsOpen]);

  // Get canvas-space coordinates from the current pointer position
  const getPointerPos = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    };
  }, [stagePos, stageScale]);

  /** Find the nearest vector endpoint within SNAP_RADIUS_PX screen pixels */
  const findSnap = useCallback(
    (pos: { x: number; y: number }): { x: number; y: number } | null => {
      if (!snapEnabled) return null;
      const radiusCanvas = SNAP_RADIUS_PX / stageScale;
      let best: { x: number; y: number } | null = null;
      let bestDist = radiusCanvas;
      for (const v of canvasData.vectors) {
        for (const pt of [
          { x: v.startX, y: v.startY },
          { x: v.endX, y: v.endY },
        ]) {
          const d = Math.hypot(pt.x - pos.x, pt.y - pos.y);
          if (d < bestDist) {
            bestDist = d;
            best = pt;
          }
        }
      }
      return best;
    },
    [snapEnabled, stageScale, canvasData.vectors],
  );

  /** Constrain pos to horizontal or vertical from origin when locked is true */
  function applyDirectionLock(
    pos: { x: number; y: number },
    origin: { x: number; y: number },
    locked: boolean,
  ): { x: number; y: number } {
    if (!locked) return pos;
    const dx = Math.abs(pos.x - origin.x);
    const dy = Math.abs(pos.y - origin.y);
    return dx >= dy
      ? { x: pos.x, y: origin.y }  // horizontal
      : { x: origin.x, y: pos.y }; // vertical
  }

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      middlePanRef.current = { lastX: e.evt.clientX, lastY: e.evt.clientY };
      return;
    }
    if (effectiveTool !== 'draw') return;
    const raw = getPointerPos();
    if (!raw) return;
    // Snap start point to nearest endpoint
    const snapped = findSnap(raw) ?? raw;
    setDrawStart(snapped);
    setDrawEnd(snapped);
    setSnapIndicator(findSnap(raw) ? snapped : null);
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    if (middlePanRef.current) {
      const dx = e.evt.clientX - middlePanRef.current.lastX;
      const dy = e.evt.clientY - middlePanRef.current.lastY;
      middlePanRef.current = { lastX: e.evt.clientX, lastY: e.evt.clientY };
      setStagePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }
    if (!drawStart) return;
    const raw = getPointerPos();
    if (!raw) return;

    // Snap end point first; if no snap, apply direction lock.
    // Lock activates via the toolbar toggle (L) OR by holding Shift.
    const snapPt = findSnap(raw);
    let end: { x: number; y: number };
    if (snapPt) {
      end = snapPt;
    } else {
      end = applyDirectionLock(raw, drawStart, directionLock || e.evt.shiftKey);
    }
    setDrawEnd(end);
    setSnapIndicator(snapPt);
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.evt.button === 1) {
      middlePanRef.current = null;
      return;
    }
    if (!drawStart || !drawEnd) return;
    const dx = drawEnd.x - drawStart.x;
    const dy = drawEnd.y - drawStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5 / stageScale) {
      const id = addVector(drawStart.x, drawStart.y, drawEnd.x, drawEnd.y, currentStrokeWidth, currentVectorColor);
      setSelectedRowId(id);
    }
    setDrawStart(null);
    setDrawEnd(null);
    setSnapIndicator(null);
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.08;
    const oldScale = stageScale;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.1, Math.min(10, newScale));

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (e.target === e.target.getStage()) setSelectedRowId(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      useProjectStore.getState().setCanvasImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Build row label map
  const rowLabelMap = new Map<string, string>();
  rows.forEach((r, i) => rowLabelMap.set(r.id, r.component || `Row ${i + 1}`));

  const { imageTransform } = canvasData;
  const snapCircleRadius = SNAP_RADIUS_PX / stageScale;

  const isMiddlePanning = middlePanRef.current !== null;
  let cursor = 'default';
  if (isMiddlePanning) cursor = 'grabbing';
  else if (spaceToolOverride !== null) cursor = 'grab';
  else if (effectiveTool === 'draw') cursor = 'crosshair';

  return (
    <div
      ref={containerRef}
      className="visual-canvas"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onMouseDown={(e) => { if (e.button === 1) e.preventDefault(); }}
      style={{ cursor }}
    >
      <Stage
        ref={stageRef}
        width={dims.width}
        height={dims.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={effectiveTool === 'select'}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleStageClick}
      >
        {/* Layer 0: Background Image */}
        <Layer>
          {bgImage && (
            <KonvaImage
              image={bgImage}
              x={imageTransform.x}
              y={imageTransform.y}
              scaleX={imageTransform.scale}
              scaleY={imageTransform.scale}
              rotation={imageTransform.rotation}
              opacity={0.6}
            />
          )}
        </Layer>

        {/* Layer 1: Vectors + drawing preview */}
        <Layer>
          {canvasData.vectors.map((v) => (
            <VectorArrow
              key={v.id}
              vector={v}
              isSelected={v.id === selectedRowId}
              label={rowLabelMap.get(v.id) ?? ''}
              highlightColor={highlightColor}
              scale={stageScale}
              onSelect={() => setSelectedRowId(v.id)}
            />
          ))}

          {/* Drawing preview line */}
          {drawStart && drawEnd && (
            <Line
              points={[drawStart.x, drawStart.y, drawEnd.x, drawEnd.y]}
              stroke={currentVectorColor}
              strokeWidth={currentStrokeWidth / stageScale}
              dash={[6 / stageScale, 3 / stageScale]}
              opacity={0.7}
            />
          )}

          {/* Magnetic snap indicator — ring at snap target */}
          {snapIndicator && (
            <Circle
              x={snapIndicator.x}
              y={snapIndicator.y}
              radius={snapCircleRadius}
              stroke={highlightColor}
              strokeWidth={2 / stageScale}
              fill={highlightColor}
              opacity={0.25}
              listening={false}
            />
          )}

          {/* Start point dot while drawing */}
          {drawStart && (
            <Circle
              x={drawStart.x}
              y={drawStart.y}
              radius={4 / stageScale}
              fill={currentVectorColor}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {canvasData.vectors.length === 0 && !canvasData.image && (
        <div className="canvas-empty-hint">
          Drop an image here or use the Draw tool to add vectors
        </div>
      )}
    </div>
  );
}
