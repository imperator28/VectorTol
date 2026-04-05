import { useRef, useState, useCallback } from 'react';
import { StackGrid } from './components/grid/StackGrid';
import { TargetPanel } from './components/targets/TargetPanel';
import { GoalSeekPanel } from './components/targets/GoalSeekPanel';
import { NominalAdvisorPanel } from './components/targets/NominalAdvisorPanel';
import { ResultsFooter } from './components/summary/ResultsFooter';
import { Toolbar } from './components/toolbar/Toolbar';
import { VisualCanvas } from './components/canvas/VisualCanvas';
import { CanvasToolbar } from './components/canvas/CanvasToolbar';
import './App.css';

const MIN_CANVAS_PCT = 15;
const MAX_CANVAS_PCT = 85;
const DEFAULT_CANVAS_PCT = 45;

const MIN_RESULTS_PX = 220;   // enough to show cards + plots
const MAX_RESULTS_PX = 500;
const DEFAULT_RESULTS_PX = 280;

const MIN_SIDEBAR_PX = 160;
const MAX_SIDEBAR_PX = 480;
const DEFAULT_SIDEBAR_PX = 240;

export function App() {
  const [canvasPct, setCanvasPct] = useState(DEFAULT_CANVAS_PCT);
  const [resultsPx, setResultsPx] = useState(DEFAULT_RESULTS_PX);
  const [sidebarPx, setSidebarPx] = useState(DEFAULT_SIDEBAR_PX);
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const workAreaRef = useRef<HTMLDivElement>(null);
  const draggingCanvas = useRef(false);
  const draggingResults = useRef(false);
  const draggingSidebar = useRef(false);

  // Canvas / grid divider
  const startCanvasResize = useCallback((e: React.MouseEvent) => {
    if (canvasCollapsed) return;
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
  }, [canvasCollapsed]);

  // Sidebar divider
  const startSidebarResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingSidebar.current = true;
    const startX = e.clientX;
    const startW = sidebarPx;

    function onMove(ev: MouseEvent) {
      if (!draggingSidebar.current) return;
      const delta = ev.clientX - startX;
      setSidebarPx(Math.max(MIN_SIDEBAR_PX, Math.min(MAX_SIDEBAR_PX, startW + delta)));
    }

    function onUp() {
      draggingSidebar.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarPx]);

  // Results pane divider
  const startResultsResize = useCallback((e: React.MouseEvent) => {
    if (resultsCollapsed) return;
    e.preventDefault();
    draggingResults.current = true;
    const startY = e.clientY;
    const startH = resultsPx;

    function onMove(ev: MouseEvent) {
      if (!draggingResults.current) return;
      const delta = startY - ev.clientY;
      setResultsPx(Math.max(MIN_RESULTS_PX, Math.min(MAX_RESULTS_PX, startH + delta)));
    }

    function onUp() {
      draggingResults.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [resultsCollapsed, resultsPx]);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">
        <div className="sidebar" style={{ width: sidebarPx }}>
          <TargetPanel />
          <GoalSeekPanel />
          <NominalAdvisorPanel />
        </div>
        <div
          className="sidebar-divider"
          onMouseDown={startSidebarResize}
          title="Drag to resize sidebar"
        />
        <div className="work-area" ref={workAreaRef}>
          {/* Canvas pane — collapsible */}
          {canvasCollapsed ? (
            <div className="pane-collapsed">
              <button
                className="pane-expand-btn"
                onClick={() => setCanvasCollapsed(false)}
                title="Show canvas"
              >
                ▾ Canvas
              </button>
            </div>
          ) : (
            <>
              <div className="canvas-pane" style={{ height: `${canvasPct}%` }}>
                <div className="pane-header">
                  <CanvasToolbar />
                  <button
                    className="pane-collapse-btn"
                    onClick={() => setCanvasCollapsed(true)}
                    title="Hide canvas"
                  >
                    ▴
                  </button>
                </div>
                <VisualCanvas />
              </div>
              <div
                className="pane-divider"
                onMouseDown={startCanvasResize}
                title="Drag to resize"
              />
            </>
          )}

          {/* Grid pane — always visible */}
          <div className="grid-pane">
            <StackGrid />
          </div>

          {/* Results pane — collapsible */}
          {resultsCollapsed ? (
            <div className="pane-collapsed pane-collapsed-bottom">
              <button
                className="pane-expand-btn"
                onClick={() => setResultsCollapsed(false)}
                title="Show results"
              >
                ▴ Results
              </button>
            </div>
          ) : (
            <>
              <div className="pane-divider results-divider">
                <button
                  className="pane-collapse-btn pane-collapse-btn-down"
                  onClick={() => setResultsCollapsed(true)}
                  title="Hide results"
                >
                  ▾
                </button>
                <div
                  className="pane-divider-drag"
                  onMouseDown={startResultsResize}
                  title="Drag to resize results"
                />
              </div>
              <div className="results-pane" style={{ height: resultsPx }}>
                <ResultsFooter />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
