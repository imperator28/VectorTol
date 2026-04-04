import { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import type { CanvasTool } from '../../types/canvas';
import { ColorPickerPopover } from './ColorPickerPopover';

const STROKE_WIDTHS = [1, 2, 3, 4, 5];

type OpenPicker = 'vector' | 'highlight' | null;

export function CanvasToolbar() {
  const canvasTool = useUiStore((s) => s.canvasTool);
  const setCanvasTool = useUiStore((s) => s.setCanvasTool);
  const currentStrokeWidth = useUiStore((s) => s.currentStrokeWidth);
  const setCurrentStrokeWidth = useUiStore((s) => s.setCurrentStrokeWidth);
  const currentVectorColor = useUiStore((s) => s.currentVectorColor);
  const setCurrentVectorColor = useUiStore((s) => s.setCurrentVectorColor);
  const highlightColor = useUiStore((s) => s.highlightColor);
  const setHighlightColor = useUiStore((s) => s.setHighlightColor);
  const selectedRowId = useUiStore((s) => s.selectedRowId);

  const directionLock = useUiStore((s) => s.directionLock);
  const toggleDirectionLock = useUiStore((s) => s.toggleDirectionLock);
  const snapEnabled = useUiStore((s) => s.snapEnabled);
  const toggleSnap = useUiStore((s) => s.toggleSnap);

  const setCanvasImage = useProjectStore((s) => s.setCanvasImage);
  const updateVector = useProjectStore((s) => s.updateVector);
  const flipAllDirections = useProjectStore((s) => s.flipAllDirections);
  const canvasData = useProjectStore((s) => s.canvasData);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);

  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);

  const selectedVector = canvasData.vectors.find((v) => v.id === selectedRowId);
  const displayWidth = selectedVector ? selectedVector.strokeWidth : currentStrokeWidth;
  const displayColor = selectedVector ? selectedVector.color : currentVectorColor;

  function handleImageImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setCanvasImage(reader.result as string);
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function handleWidthChange(w: number) {
    setCurrentStrokeWidth(w);
    if (selectedRowId) updateVector(selectedRowId, { strokeWidth: w });
  }

  function handleVectorColorChange(color: string) {
    setCurrentVectorColor(color);
    if (selectedRowId) updateVector(selectedRowId, { color });
  }

  function btn(tool: CanvasTool, label: string) {
    return (
      <button
        className={canvasTool === tool ? 'canvas-tool-active' : ''}
        onClick={() => setCanvasTool(tool)}
        title={tool === 'select' ? 'Select / Move (V)' : 'Draw Vector (D)'}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="canvas-toolbar">
      <button onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)">↩ Undo</button>
      <button onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y / Ctrl+Shift+Z)">↪ Redo</button>
      <span className="canvas-toolbar-sep" />
      {btn('select', '⇱ Select')}
      {btn('draw', '➔ Draw')}
      <span className="canvas-toolbar-sep" />
      <span className="canvas-toolbar-label">Width:</span>
      {STROKE_WIDTHS.map((w) => (
        <button
          key={w}
          className={displayWidth === w ? 'canvas-tool-active' : ''}
          onClick={() => handleWidthChange(w)}
          title={`Stroke width ${w}px`}
        >
          {w}
        </button>
      ))}
      <span className="canvas-toolbar-sep" />

      {/* Vector color */}
      <span className="canvas-toolbar-label">Color:</span>
      <div className="color-swatch-btn-wrapper">
        <button
          className="color-swatch-btn"
          style={{ background: displayColor }}
          title="Arrow color"
          onClick={() => setOpenPicker(openPicker === 'vector' ? null : 'vector')}
        />
        {openPicker === 'vector' && (
          <ColorPickerPopover
            label="Arrow Color"
            currentColor={displayColor}
            onChange={handleVectorColorChange}
            onClose={() => setOpenPicker(null)}
          />
        )}
      </div>

      {/* Highlight color */}
      <span className="canvas-toolbar-label">Highlight:</span>
      <div className="color-swatch-btn-wrapper">
        <button
          className="color-swatch-btn"
          style={{ background: highlightColor }}
          title="Selected arrow highlight color"
          onClick={() => setOpenPicker(openPicker === 'highlight' ? null : 'highlight')}
        />
        {openPicker === 'highlight' && (
          <ColorPickerPopover
            label="Highlight Color"
            currentColor={highlightColor}
            onChange={(c) => { setHighlightColor(c); }}
            onClose={() => setOpenPicker(null)}
          />
        )}
      </div>

      <span className="canvas-toolbar-sep" />
      <button
        className={directionLock ? 'canvas-tool-active' : ''}
        onClick={toggleDirectionLock}
        title="Direction Lock — constrain arrows to horizontal or vertical only (L)"
      >
        ⊥ Lock
      </button>
      <button
        className={snapEnabled ? 'canvas-tool-active' : ''}
        onClick={toggleSnap}
        title="Magnetic Snap — auto-snap to existing vector endpoints (S)"
      >
        🧲 Snap
      </button>
      <button
        onClick={flipAllDirections}
        title="Flip all vector directions (+/- swap)"
      >
        ⇄ Flip All
      </button>
      <span className="canvas-toolbar-sep" />
      <button onClick={handleImageImport} title="Import background image">
        🖼 Image
      </button>
      <span className="canvas-toolbar-hint">Space=pan</span>
    </div>
  );
}
