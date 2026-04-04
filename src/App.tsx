import { useRef, useState, useCallback } from 'react';
import { StackGrid } from './components/grid/StackGrid';
import { TargetPanel } from './components/targets/TargetPanel';
import { ResultsFooter } from './components/summary/ResultsFooter';
import { Toolbar } from './components/toolbar/Toolbar';
import { VisualCanvas } from './components/canvas/VisualCanvas';
import { CanvasToolbar } from './components/canvas/CanvasToolbar';
import './App.css';

const MIN_CANVAS_PCT = 15;
const MAX_CANVAS_PCT = 85;
const DEFAULT_CANVAS_PCT = 45;

export function App() {
  const [canvasPct, setCanvasPct] = useState(DEFAULT_CANVAS_PCT);
  const workAreaRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;

    function onMove(ev: MouseEvent) {
      if (!dragging.current || !workAreaRef.current) return;
      const rect = workAreaRef.current.getBoundingClientRect();
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setCanvasPct(Math.max(MIN_CANVAS_PCT, Math.min(MAX_CANVAS_PCT, pct)));
    }

    function onUp() {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">
        <div className="sidebar">
          <TargetPanel />
        </div>
        <div className="work-area" ref={workAreaRef}>
          <div className="canvas-pane" style={{ height: `${canvasPct}%` }}>
            <CanvasToolbar />
            <VisualCanvas />
          </div>
          <div
            className="pane-divider"
            onMouseDown={startResize}
            title="Drag to resize"
          />
          <div className="grid-pane">
            <StackGrid />
          </div>
        </div>
      </div>
      <ResultsFooter />
    </div>
  );
}
