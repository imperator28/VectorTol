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

const MIN_CANVAS_PCT = 15;
const MAX_CANVAS_PCT = 85;
const DEFAULT_CANVAS_PCT = 45;

// Right insights panel
const MIN_RIGHT_PX = 300;
const MAX_RIGHT_PX = 680;
const DEFAULT_RIGHT_PX = 420;

export function App() {
  const themeMode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const [canvasPct, setCanvasPct] = useState(DEFAULT_CANVAS_PCT);
  const [rightPanelPx, setRightPanelPx] = useState(DEFAULT_RIGHT_PX);
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);

  const workAreaRef = useRef<HTMLDivElement>(null);
  const draggingCanvas = useRef(false);
  const draggingRight = useRef(false);

  // Canvas / grid vertical divider
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

  // Right panel horizontal divider
  const startRightResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRight.current = true;
    const startX = e.clientX;
    const startW = rightPanelPx;

    function onMove(ev: MouseEvent) {
      if (!draggingRight.current) return;
      const delta = startX - ev.clientX; // dragging left increases width
      setRightPanelPx(Math.max(MIN_RIGHT_PX, Math.min(MAX_RIGHT_PX, startW + delta)));
    }
    function onUp() {
      draggingRight.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [rightPanelPx]);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">

        {/* ── LEFT: Workspace — canvas + stack-up grid ─────────────────────── */}
        <div className="workspace-panel" ref={workAreaRef}>
          {/* Canvas label bar — always visible */}
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
              <div
                className="pane-divider"
                onMouseDown={startCanvasResize}
                title="Drag to resize"
              />
            </>
          )}

          {/* Stack-up grid — always visible, fills remaining space */}
          <div className="pane-label-bar pane-label-bar-grid">
            <span className="pane-label-text">Stack-up</span>
          </div>
          <div className="grid-pane">
            <StackGrid />
          </div>
        </div>

        {/* ── DIVIDER ────────────────────────────────────────────────────────── */}
        <div
          className="panel-divider"
          onMouseDown={startRightResize}
          title="Drag to resize"
        />

        {/* ── RIGHT: Insights — design intent + results + advisors ─────────── */}
        <div className="insights-panel" style={{ width: rightPanelPx }}>

          {/* 1. Design Intent */}
          <div className="insight-section">
            <div className="insight-section-label">Design Intent</div>
            <TargetPanel />
          </div>

          <div className="insight-sep" />

          {/* 2. Analysis Results */}
          <div className="insight-section insight-section-results">
            <div className="insight-section-label">Analysis Results</div>
            <ResultsFooter />
          </div>

          <div className="insight-sep" />

          {/* 3. Tolerance Allocation */}
          <GoalSeekPanel />

          <div className="insight-sep" />

          {/* 4. Nominal Advisor */}
          <NominalAdvisorPanel />

        </div>
      </div>
    </div>
  );
}
