import { useState, useRef } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import type { CanvasTool } from '../../types/canvas';
import { ColorPickerPopover } from './ColorPickerPopover';
import { Icon } from '../ui/Icon';
import { computeFitTransform } from '../../utils/stageRef';

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
  const setImageTransform = useProjectStore((s) => s.setImageTransform);
  const updateVector = useProjectStore((s) => s.updateVector);
  const flipAllDirections = useProjectStore((s) => s.flipAllDirections);
  const canvasData = useProjectStore((s) => s.canvasData);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);

  const [openPicker, setOpenPicker] = useState<OpenPicker>(null);
  // Refs for portal anchoring — allow the popover to escape overflow:hidden on the toolbar
  const vectorSwatchRef = useRef<HTMLButtonElement>(null);
  const highlightSwatchRef = useRef<HTMLButtonElement>(null);

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
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setCanvasImage(dataUrl);
        // Auto-fit after image loads
        const img = new window.Image();
        img.onload = () => {
          const fit = computeFitTransform(img.naturalWidth, img.naturalHeight);
          if (fit) setImageTransform({ x: fit.x, y: fit.y, scale: fit.scale, rotation: 0 });
        };
        img.src = dataUrl;
      };
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
    const icon = tool === 'select' ? 'cursor' : 'pen';
    return (
      <button
        className={canvasTool === tool ? 'canvas-tool-active' : ''}
        onClick={() => setCanvasTool(tool)}
        title={tool === 'select' ? 'Select / Move (V)' : 'Draw Vector (D)'}
      >
        <Icon name={icon} size={14} /> {label}
      </button>
    );
  }

  return (
    <div className="canvas-toolbar">
      <button onClick={undo} disabled={past.length === 0} title="Undo (Ctrl+Z)"><Icon name="undo" size={14} /> Undo</button>
      <button onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y / Ctrl+Shift+Z)"><Icon name="redo" size={14} /> Redo</button>
      <span className="canvas-toolbar-sep" />
      {btn('select', 'Select')}
      {btn('draw', 'Draw')}
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

      {/* Vector color — portal-based picker escapes toolbar overflow */}
      <span className="canvas-toolbar-label">Color:</span>
      <div className="color-swatch-btn-wrapper">
        <button
          ref={vectorSwatchRef}
          className="color-swatch-btn"
          style={{ background: displayColor }}
          title="Arrow color"
          onClick={() => setOpenPicker(openPicker === 'vector' ? null : 'vector')}
        />
        {openPicker === 'vector' && (
          <ColorPickerPopover
            label="Arrow Color"
            currentColor={displayColor}
            anchorEl={vectorSwatchRef.current}
            onChange={handleVectorColorChange}
            onClose={() => setOpenPicker(null)}
          />
        )}
      </div>

      {/* Highlight color */}
      <span className="canvas-toolbar-label">Highlight:</span>
      <div className="color-swatch-btn-wrapper">
        <button
          ref={highlightSwatchRef}
          className="color-swatch-btn"
          style={{ background: highlightColor }}
          title="Selected arrow highlight color"
          onClick={() => setOpenPicker(openPicker === 'highlight' ? null : 'highlight')}
        />
        {openPicker === 'highlight' && (
          <ColorPickerPopover
            label="Highlight Color"
            currentColor={highlightColor}
            anchorEl={highlightSwatchRef.current}
            onChange={(c) => { setHighlightColor(c); }}
            onClose={() => setOpenPicker(null)}
          />
        )}
      </div>

      <span className="canvas-toolbar-sep" />
      <button
        className={directionLock ? 'canvas-tool-active' : ''}
        onClick={toggleDirectionLock}
        title="Direction Lock — constrain arrows to H/V only. Toggle with L, or hold Shift while drawing"
      >
        <Icon name={directionLock ? 'lock' : 'unlock'} size={14} /> Lock
      </button>
      <button
        className={snapEnabled ? 'canvas-tool-active' : ''}
        onClick={toggleSnap}
        title="Magnetic Snap — auto-snap to existing vector endpoints (S)"
      >
        <Icon name="snap" size={14} /> Snap
      </button>
      <button
        onClick={flipAllDirections}
        title="Flip all vector directions (+/- swap)"
      >
        <Icon name="flip-h" size={14} /> Flip All
      </button>
      <span className="canvas-toolbar-sep" />
      <button onClick={handleImageImport} title="Import background image">
        <Icon name="image" size={14} /> Image
      </button>
      <button
        onClick={() => {
          if (!canvasData.image) return;
          const img = new window.Image();
          img.onload = () => {
            const fit = computeFitTransform(img.naturalWidth, img.naturalHeight);
            if (fit) setImageTransform({ x: fit.x, y: fit.y, scale: fit.scale, rotation: canvasData.imageTransform.rotation });
          };
          img.src = canvasData.image;
        }}
        disabled={!canvasData.image}
        title="Fit image to canvas"
      >
        Fit
      </button>
      <span className="canvas-toolbar-hint">Space=pan</span>
    </div>
  );
}
