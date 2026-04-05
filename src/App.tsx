import { useRef, useState, useCallback, useEffect } from 'react';
import { StackGrid } from './components/grid/StackGrid';
import { TargetPanel } from './components/targets/TargetPanel';
import { GoalSeekPanel } from './components/targets/GoalSeekPanel';
import { NominalAdvisorPanel } from './components/targets/NominalAdvisorPanel';
import { ResultsFooter } from './components/summary/ResultsFooter';
import { Toolbar } from './components/toolbar/Toolbar';
import { VisualCanvas } from './components/canvas/VisualCanvas';
import { CanvasToolbar } from './components/canvas/CanvasToolbar';
import { useThemeStore } from './store/themeStore';
import { Icon } from './components/ui/Icon';
import './App.css';

// ── Resize constants ─────────────────────────────────────────────────────────
const MIN_CANVAS_PCT  = 15;
const MAX_CANVAS_PCT  = 85;
const DEFAULT_CANVAS_PCT = 45;

const MIN_RIGHT_PX    = 300;
const MAX_RIGHT_PX    = 700;
const DEFAULT_RIGHT_PX = 420;

const MIN_RESULTS_PX  = 120;
const MAX_RESULTS_PX  = 480;
const DEFAULT_RESULTS_PX = 240;

const MIN_ALLOC_PX    = 60;
const MAX_ALLOC_PX    = 480;
const DEFAULT_ALLOC_PX = 220;

const MIN_ADVISOR_PX  = 60;

export function App() {
  const themeMode = useThemeStore((s) => s.mode);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // ── Workspace (left) state ───────────────────────────────────────────────
  const [canvasPct, setCanvasPct] = useState(DEFAULT_CANVAS_PCT);
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const workAreaRef = useRef<HTMLDivElement>(null);
  const draggingCanvas = useRef(false);

  // ── Right panel state ────────────────────────────────────────────────────
  const [rightPanelPx, setRightPanelPx] = useState(DEFAULT_RIGHT_PX);
  const [resultsPx, setResultsPx] = useState(DEFAULT_RESULTS_PX);
  const [allocPx, setAllocPx] = useState(DEFAULT_ALLOC_PX);
  const [allocCollapsed, setAllocCollapsed] = useState(false);
  const [advisorCollapsed, setAdvisorCollapsed] = useState(false);
  const draggingRight = useRef(false);
  const draggingResults = useRef(false);
  const draggingAlloc = useRef(false);

  // ── Resize handlers ───────────────────────────────────────────────────────

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
    function onUp() { draggingCanvas.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [canvasCollapsed]);

  const startRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRight.current = true;
    const startX = e.clientX; const startW = rightPanelPx;
    function onMove(ev: MouseEvent) {
      if (!draggingRight.current) return;
      setRightPanelPx(Math.max(MIN_RIGHT_PX, Math.min(MAX_RIGHT_PX, startW + (startX - ev.clientX))));
    }
    function onUp() { draggingRight.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rightPanelPx]);

  const startResultsResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingResults.current = true;
    const startY = e.clientY; const startH = resultsPx;
    function onMove(ev: MouseEvent) {
      if (!draggingResults.current) return;
      setResultsPx(Math.max(MIN_RESULTS_PX, Math.min(MAX_RESULTS_PX, startH + (ev.clientY - startY))));
    }
    function onUp() { draggingResults.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [resultsPx]);

  const startAllocResize = useCallback((e: React.MouseEvent) => {
    if (allocCollapsed) return;
    e.preventDefault();
    draggingAlloc.current = true;
    const startY = e.clientY; const startH = allocPx;
    function onMove(ev: MouseEvent) {
      if (!draggingAlloc.current) return;
      setAllocPx(Math.max(MIN_ALLOC_PX, Math.min(MAX_ALLOC_PX, startH + (ev.clientY - startY))));
    }
    function onUp() { draggingAlloc.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [allocCollapsed, allocPx]);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">

        {/* ── LEFT: Workspace ── canvas + stack-up grid ─────────────────────── */}
        <div className="workspace-panel" ref={workAreaRef}>

          {/* Canvas — collapsible */}
          <div
            className="pane-label-bar"
            onClick={() => canvasCollapsed && setCanvasCollapsed(false)}
            style={canvasCollapsed ? { cursor: 'pointer' } : undefined}
          >
            <span className="pane-label-text">Canvas</span>
            <button
              className="pane-toggle-btn"
              onClick={(e) => { e.stopPropagation(); setCanvasCollapsed(!canvasCollapsed); }}
              title={canvasCollapsed ? 'Expand canvas' : 'Collapse canvas'}
            >
              <Icon name={canvasCollapsed ? 'chevron-down' : 'chevron-up'} size={12} />
            </button>
          </div>
          {!canvasCollapsed && (
            <>
              <div className="canvas-pane" style={{ height: `${canvasPct}%` }}>
                <CanvasToolbar />
                <VisualCanvas />
              </div>
              <div className="pane-divider" onMouseDown={startCanvasResize} title="Drag to resize" />
            </>
          )}

          {/* Stack-up grid — always visible */}
          <div className="pane-label-bar pane-label-bar-grid">
            <span className="pane-label-text">Stack-up</span>
          </div>
          <div className="grid-pane">
            <StackGrid />
          </div>
        </div>

        {/* ── Center divider (col-resize) ──────────────────────────────────── */}
        <div className="panel-divider" onMouseDown={startRightResize} title="Drag to resize" />

        {/* ── RIGHT: Insights ── independent resizable sections ────────────── */}
        <div className="insights-panel" style={{ width: rightPanelPx }}>

          {/* 1. Design Intent — compact, auto height */}
          <div className="rp-section rp-section-intent">
            <div className="rp-label-bar">
              <span className="rp-label-text">Design Intent</span>
            </div>
            <div className="rp-content rp-content-noscroll">
              <TargetPanel />
            </div>
          </div>

          {/* 2. Analysis Results — resizable, divider at bottom */}
          <div className="rp-section" style={{ height: resultsPx }}>
            <div className="rp-label-bar">
              <span className="rp-label-text">Analysis Results</span>
            </div>
            <div className="rp-content">
              <ResultsFooter />
            </div>
          </div>
          <div
            className="rp-divider"
            onMouseDown={startResultsResize}
            title="Drag to resize"
          />

          {/* 3. Tolerance Allocation — collapsible + resizable, divider at bottom */}
          <div
            className="rp-section"
            style={allocCollapsed ? undefined : { height: allocPx }}
          >
            <div
              className="rp-label-bar rp-label-bar-toggle"
              onClick={() => allocCollapsed && setAllocCollapsed(false)}
              style={allocCollapsed ? { cursor: 'pointer' } : undefined}
            >
              <span className="rp-label-text">Tolerance Allocation</span>
              <button
                className="pane-toggle-btn"
                onClick={(e) => { e.stopPropagation(); setAllocCollapsed(!allocCollapsed); }}
                title={allocCollapsed ? 'Expand' : 'Collapse'}
              >
                <Icon name={allocCollapsed ? 'chevron-down' : 'chevron-up'} size={12} />
              </button>
            </div>
            {!allocCollapsed && (
              <div className="rp-content">
                <GoalSeekPanel />
              </div>
            )}
          </div>
          <div
            className="rp-divider"
            onMouseDown={allocCollapsed ? undefined : startAllocResize}
            title={allocCollapsed ? undefined : 'Drag to resize'}
            style={allocCollapsed ? { cursor: 'default', opacity: 0.4 } : undefined}
          />

          {/* 4. Nominal Advisor — collapsible, takes remaining space */}
          <div
            className="rp-section rp-section-flex"
            style={{ minHeight: advisorCollapsed ? 0 : MIN_ADVISOR_PX }}
          >
            <div
              className="rp-label-bar rp-label-bar-toggle"
              onClick={() => advisorCollapsed && setAdvisorCollapsed(false)}
              style={advisorCollapsed ? { cursor: 'pointer' } : undefined}
            >
              <span className="rp-label-text">Nominal Advisor</span>
              <button
                className="pane-toggle-btn"
                onClick={(e) => { e.stopPropagation(); setAdvisorCollapsed(!advisorCollapsed); }}
                title={advisorCollapsed ? 'Expand' : 'Collapse'}
              >
                <Icon name={advisorCollapsed ? 'chevron-down' : 'chevron-up'} size={12} />
              </button>
            </div>
            {!advisorCollapsed && (
              <div className="rp-content">
                <NominalAdvisorPanel />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
