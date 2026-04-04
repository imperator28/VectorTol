import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { VectorArrow } from './VectorArrow';
import type Konva from 'konva';

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

  // Canvas dimensions
  const [dims, setDims] = useState({ width: 600, height: 400 });
  // Pan/zoom
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  // Drawing state
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);
  // Spacebar pan override — tracks tool to restore after spacebar release
  const [spaceToolOverride, setSpaceToolOverride] = useState<string | null>(null);
  // Middle-button pan
  const middlePanRef = useRef<{ lastX: number; lastY: number } | null>(null);

  const bgImage = useImage(canvasData.image);

  // Effective tool: spacebar overrides to 'select' (pan mode)
  const effectiveTool = spaceToolOverride !== null ? 'select' : canvasTool;

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

      // Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); return; }
      }

      if (e.key === 'v' || e.key === 'V') setCanvasTool('select');
      if (e.key === 'd' || e.key === 'D') setCanvasTool('draw');

      // Spacebar = temporary pan mode
      if (e.key === ' ' && spaceToolOverride === null) {
        e.preventDefault();
        setSpaceToolOverride(canvasTool);
        setDrawStart(null);
        setDrawEnd(null);
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRowId) {
        removeVector(selectedRowId);
        setSelectedRowId(null);
      }
      if (e.key === 'Escape') {
        setDrawStart(null);
        setDrawEnd(null);
        setSelectedRowId(null);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' && spaceToolOverride !== null) {
        setSpaceToolOverride(null);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedRowId, canvasTool, spaceToolOverride, setCanvasTool, removeVector, setSelectedRowId, undo, redo]);

  // Get real canvas coords accounting for pan/zoom
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

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    // Middle button (button 1) → start pan regardless of tool
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      middlePanRef.current = { lastX: e.evt.clientX, lastY: e.evt.clientY };
      return;
    }
    if (effectiveTool !== 'draw') return;
    const pos = getPointerPos();
    if (!pos) return;
    setDrawStart(pos);
    setDrawEnd(pos);
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    // Middle button pan
    if (middlePanRef.current) {
      const dx = e.evt.clientX - middlePanRef.current.lastX;
      const dy = e.evt.clientY - middlePanRef.current.lastY;
      middlePanRef.current = { lastX: e.evt.clientX, lastY: e.evt.clientY };
      setStagePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      return;
    }
    if (!drawStart) return;
    const pos = getPointerPos();
    if (!pos) return;
    setDrawEnd(pos);
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    // Middle button release
    if (e.evt.button === 1) {
      middlePanRef.current = null;
      return;
    }
    if (!drawStart || !drawEnd) return;
    const dx = drawEnd.x - drawStart.x;
    const dy = drawEnd.y - drawStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 10) {
      const id = addVector(drawStart.x, drawStart.y, drawEnd.x, drawEnd.y, currentStrokeWidth, currentVectorColor);
      setSelectedRowId(id);
    }
    setDrawStart(null);
    setDrawEnd(null);
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
    if (e.target === e.target.getStage()) {
      setSelectedRowId(null);
    }
  }

  // Drag-and-drop image import
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

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  // Build row label map
  const rowLabelMap = new Map<string, string>();
  rows.forEach((r, i) => {
    rowLabelMap.set(r.id, r.component || `Row ${i + 1}`);
  });

  const { imageTransform } = canvasData;

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
      onDragOver={handleDragOver}
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

        {/* Layer 1: Vectors */}
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

          {/* Drawing preview — also viewport-invariant */}
          {drawStart && drawEnd && (
            <Line
              points={[drawStart.x, drawStart.y, drawEnd.x, drawEnd.y]}
              stroke={currentVectorColor}
              strokeWidth={currentStrokeWidth / stageScale}
              dash={[6 / stageScale, 3 / stageScale]}
              opacity={0.7}
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
