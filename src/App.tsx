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

const MIN_RESULTS_PX = 60;
const MAX_RESULTS_PX = 500;
const DEFAULT_RESULTS_PX = 260;

export function App() {
  const [canvasPct, setCanvasPct] = useState(DEFAULT_CANVAS_PCT);
  const [resultsPx, setResultsPx] = useState(DEFAULT_RESULTS_PX);
  const workAreaRef = useRef<HTMLDivElement>(null);
  const draggingCanvas = useRef(false);
  const draggingResults = useRef(false);

  // Canvas / grid divider
  const startCanvasResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingCanvas.current = true;

    function onMove(ev: MouseEvent) {
      if (!draggingCanvas.current || !workAreaRef.current) return;
      const rect = workAreaRef.current.getBoundingClientRect();
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setCanvasPct(Math.max(MIN_CANVAS_PCT, Math.min(MAX_CANVAS_PCT, pct)));
    }

    function onUp() {
      draggingCanvas.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  // Results pane divider (drag up/down to resize height)
  const startResultsResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingResults.current = true;
    const startY = e.clientY;
    const startH = resultsPx;

    function onMove(ev: MouseEvent) {
      if (!draggingResults.current) return;
      const delta = startY - ev.clientY; // dragging up = bigger
      setResultsPx(Math.max(MIN_RESULTS_PX, Math.min(MAX_RESULTS_PX, startH + delta)));
    }

    function onUp() {
      draggingResults.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [resultsPx]);

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
            onMouseDown={startCanvasResize}
            title="Drag to resize"
          />
          <div className="grid-pane">
            <StackGrid />
          </div>
          <div
            className="pane-divider results-divider"
            onMouseDown={startResultsResize}
            title="Drag to resize results"
          />
          <div className="results-pane" style={{ height: resultsPx }}>
            <ResultsFooter />
          </div>
        </div>
      </div>
    </div>
  );
}
