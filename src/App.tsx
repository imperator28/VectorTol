import { useRef, useState, useCallback, useEffect } from 'react';
import { StackGrid } from './components/grid/StackGrid';
import { TargetPanel } from './components/targets/TargetPanel';
import { GoalSeekPanel } from './components/targets/GoalSeekPanel';
import { NominalAdvisorPanel } from './components/targets/NominalAdvisorPanel';
import { ResultsFooter } from './components/summary/ResultsFooter';
import { Toolbar } from './components/toolbar/Toolbar';
import { VisualCanvas } from './components/canvas/VisualCanvas';
import { CanvasToolbar } from './components/canvas/CanvasToolbar';
import { TutorialOverlay } from './components/tutorial/TutorialOverlay';
import { ShortcutsModal } from './components/ui/ShortcutsModal';
import { useThemeStore } from './store/themeStore';
import { useTutorialStore, TUTORIAL_STORAGE_KEY } from './store/tutorialStore';
import { useUiStore } from './store/uiStore';
import { useProjectStore } from './store/projectStore';
import { clearAutosaveDraft, loadAutosaveDraft } from './utils/autosave';
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

const RP_DIVIDER_PX = 8;
const RP_DIVIDER_COUNT = 2;

const MIN_ALLOC_PX    = 112;
const MAX_ALLOC_PX    = 480;
const DEFAULT_ALLOC_PX = 220;

const MIN_ADVISOR_PX  = 132;
const RP_HEADER_PX = 26;

type FocusedInsightsSection = 'alloc' | 'advisor' | null;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snapToNearest(value: number, snapPoints: number[]): number {
  if (snapPoints.length === 0) return value;

  return snapPoints.reduce((closest, point) =>
    Math.abs(point - value) < Math.abs(closest - value) ? point : closest,
  );
}

function useMeasuredElementHeight<T extends HTMLElement>(
  active: boolean,
  mode: 'box' | 'scroll' = 'box',
) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!active) {
      setHeight(null);
      return;
    }
    const element = ref.current;
    if (!element) return;

    const update = () => setHeight(
      Math.ceil(mode === 'scroll' ? element.scrollHeight : element.getBoundingClientRect().height),
    );
    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [active, mode]);

  return [ref, height] as const;
}

function useResultsSnapHeights(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [snapHeights, setSnapHeights] = useState<number[]>([]);

  useEffect(() => {
    if (!active) {
      setContentHeight(null);
      setSnapHeights([]);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const update = () => {
      const nextContentHeight = Math.ceil(element.scrollHeight);
      setContentHeight(nextContentHeight);

      const footer = element.querySelector('.results-footer') as HTMLElement | null;
      const grid = element.querySelector('.results-cards') as HTMLElement | null;

      if (!footer || !grid || grid.children.length === 0) {
        setSnapHeights([clamp(nextContentHeight + RP_HEADER_PX, MIN_RESULTS_PX, MAX_RESULTS_PX)]);
        return;
      }

      const footerRect = footer.getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      const rowBottoms = new Map<number, number>();
      Array.from(grid.children).forEach((child) => {
        const card = child as HTMLElement;
        const cardRect = card.getBoundingClientRect();
        const top = Math.round(cardRect.top - gridRect.top);
        const bottom = Math.ceil(cardRect.bottom - gridRect.top);
        rowBottoms.set(top, Math.max(rowBottoms.get(top) ?? 0, bottom));
      });

      const footerStyles = window.getComputedStyle(footer);
      const footerBottomPadding = parseFloat(footerStyles.paddingBottom) || 0;
      const contentOffset = Math.max(0, Math.round(gridRect.top - footerRect.top));
      const nextSnapHeights = Array.from(rowBottoms.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, bottom]) => clamp(Math.ceil(contentOffset + bottom + footerBottomPadding + RP_HEADER_PX), MIN_RESULTS_PX, MAX_RESULTS_PX))
        .filter((height, index, arr) => index === 0 || height !== arr[index - 1]);

      setSnapHeights(nextSnapHeights);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [active]);

  return [ref, contentHeight, snapHeights] as const;
}

export function App() {
  const themeMode = useThemeStore((s) => s.mode);
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const setShortcutsOpen = useUiStore((s) => s.setShortcutsOpen);
  const loadProject = useProjectStore((s) => s.loadProject);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // Stamp platform class so CSS can target the macOS overlay title bar
  useEffect(() => {
    const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (inTauri && navigator.userAgent.includes('Macintosh')) {
      document.documentElement.classList.add('platform-macos');
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    const draft = loadAutosaveDraft();
    if (!draft) {
      setRecoveryChecked(true);
      return;
    }

    const savedAt = new Date(draft.savedAt).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const shouldRestore = window.confirm(
      [
        'An auto-saved draft was found.',
        '',
        `Title: ${draft.metadata.projectName || 'Untitled'}`,
        `Author: ${draft.metadata.author || 'Not set'}`,
        `Saved: ${savedAt}`,
        '',
        'Restore this draft now?',
      ].join('\n'),
    );

    if (shouldRestore) {
      loadProject(draft.metadata, draft.rows, draft.target, draft.currentFilePath, draft.canvasData);
      setRestoredDraft(true);
    } else {
      clearAutosaveDraft();
    }

    setRecoveryChecked(true);
  }, [loadProject]);

  // ── Tutorial auto-start on first load ────────────────────────────────────
  const startTutorial = useTutorialStore((s) => s.start);
  useEffect(() => {
    if (!recoveryChecked || restoredDraft) return;
    const seen = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => startTutorial(), 400);
      return () => clearTimeout(timer);
    }
  }, [recoveryChecked, restoredDraft, startTutorial]);

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
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [focusedInsightsSection, setFocusedInsightsSection] = useState<FocusedInsightsSection>(null);
  const draggingRight = useRef(false);
  const draggingResults = useRef(false);
  const draggingAlloc = useRef(false);
  const [insightsPanelRef, insightsPanelHeight] = useMeasuredElementHeight<HTMLDivElement>(true);
  const [intentSectionRef, intentSectionHeight] = useMeasuredElementHeight<HTMLDivElement>(true);
  const [resultsContentRef, resultsContentHeight, resultsSnapHeights] = useResultsSnapHeights(!resultsCollapsed);
  const [allocContentRef, allocContentHeight] = useMeasuredElementHeight<HTMLDivElement>(!allocCollapsed, 'scroll');
  const [advisorContentRef, advisorContentHeight] = useMeasuredElementHeight<HTMLDivElement>(!advisorCollapsed, 'scroll');

  const panelChromePx = (intentSectionHeight ?? 0) + RP_DIVIDER_PX * RP_DIVIDER_COUNT;
  const minAllocSectionPx = allocCollapsed ? RP_HEADER_PX : MIN_ALLOC_PX;
  const minAdvisorSectionPx = advisorCollapsed ? RP_HEADER_PX : MIN_ADVISOR_PX;

  const resultsContentMaxPx = resultsSnapHeights[resultsSnapHeights.length - 1]
    ?? (resultsContentHeight === null
      ? MAX_RESULTS_PX
      : clamp(resultsContentHeight + RP_HEADER_PX, MIN_RESULTS_PX, MAX_RESULTS_PX));
  const resultsMaxByPanelPx = insightsPanelHeight === null
    ? MAX_RESULTS_PX
    : insightsPanelHeight - panelChromePx - minAllocSectionPx - minAdvisorSectionPx;
  const resultsResizeMaxPx = clamp(
    Math.min(resultsContentMaxPx, resultsMaxByPanelPx),
    MIN_RESULTS_PX,
    MAX_RESULTS_PX,
  );
  const hasHiddenResultsSnapHeights = resultsSnapHeights.some((height) => height > resultsResizeMaxPx + 1);
  const effectiveResultsSnapHeights = resultsSnapHeights.filter((height) => height <= resultsResizeMaxPx + 1);
  const boundedResultsPx = resultsCollapsed
    ? RP_HEADER_PX
    : clamp(
      effectiveResultsSnapHeights.length > 0
        ? snapToNearest(resultsPx, effectiveResultsSnapHeights)
        : resultsPx,
      MIN_RESULTS_PX,
      resultsResizeMaxPx,
    );

  const allocContentMaxPx = allocContentHeight === null ? MAX_ALLOC_PX : allocContentHeight + RP_HEADER_PX;
  const allocMaxByPanelPx = insightsPanelHeight === null
    ? MAX_ALLOC_PX
    : insightsPanelHeight - panelChromePx - boundedResultsPx - minAdvisorSectionPx;
  const allocResizeMaxPx = clamp(
    Math.min(allocContentMaxPx, allocMaxByPanelPx),
    MIN_ALLOC_PX,
    MAX_ALLOC_PX,
  );
  const allocFocusMaxPx = insightsPanelHeight === null || allocContentHeight === null
    ? undefined
    : Math.max(
      MIN_ALLOC_PX,
      Math.min(
        allocContentHeight + RP_HEADER_PX,
        insightsPanelHeight
          - panelChromePx
          - (resultsCollapsed ? RP_HEADER_PX : MIN_RESULTS_PX)
          - (advisorCollapsed ? RP_HEADER_PX : MIN_ADVISOR_PX),
      ),
    );
  const advisorFocusMaxPx = insightsPanelHeight === null || advisorContentHeight === null
    ? undefined
    : Math.max(
      MIN_ADVISOR_PX,
      Math.min(
        advisorContentHeight + RP_HEADER_PX,
        insightsPanelHeight
          - panelChromePx
          - (resultsCollapsed ? RP_HEADER_PX : MIN_RESULTS_PX)
          - (allocCollapsed ? RP_HEADER_PX : MIN_ALLOC_PX),
      ),
    );
  const allocationFocused = focusedInsightsSection === 'alloc' && !allocCollapsed;
  const advisorFocused = focusedInsightsSection === 'advisor' && !advisorCollapsed;

  const focusResultsPanel = useCallback((desiredHeight?: number) => {
    setFocusedInsightsSection(null);
    setAllocCollapsed(true);
    setAdvisorCollapsed(true);

    if (desiredHeight === undefined) return;

    const nextDesired = clamp(desiredHeight, MIN_RESULTS_PX, resultsContentMaxPx);
    setResultsPx(resultsSnapHeights.length > 0 ? snapToNearest(nextDesired, resultsSnapHeights) : nextDesired);
  }, [resultsContentMaxPx, resultsSnapHeights]);

  useEffect(() => {
    if (!resultsCollapsed) {
      setResultsPx((current) => {
        const bounded = Math.min(current, resultsResizeMaxPx);
        return effectiveResultsSnapHeights.length > 0 ? snapToNearest(bounded, effectiveResultsSnapHeights) : bounded;
      });
    }
  }, [effectiveResultsSnapHeights, resultsCollapsed, resultsResizeMaxPx]);

  useEffect(() => {
    if (!allocCollapsed && allocContentHeight !== null) {
      setAllocPx((current) => Math.min(current, allocResizeMaxPx));
    }
  }, [allocCollapsed, allocContentHeight, allocResizeMaxPx]);

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
      const rawDesired = startH + (ev.clientY - startY);
      if (rawDesired > resultsResizeMaxPx + 12 && hasHiddenResultsSnapHeights) {
        focusResultsPanel(rawDesired);
        return;
      }

      const desired = clamp(rawDesired, MIN_RESULTS_PX, resultsResizeMaxPx);
      setResultsPx(effectiveResultsSnapHeights.length > 0 ? snapToNearest(desired, effectiveResultsSnapHeights) : desired);
    }
    function onUp() { draggingResults.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [effectiveResultsSnapHeights, focusResultsPanel, hasHiddenResultsSnapHeights, resultsPx, resultsResizeMaxPx]);

  const startAllocResize = useCallback((e: React.MouseEvent) => {
    if (allocCollapsed) return;
    e.preventDefault();
    draggingAlloc.current = true;
    const startY = e.clientY; const startH = allocPx;
    function onMove(ev: MouseEvent) {
      if (!draggingAlloc.current) return;
      setAllocPx(Math.max(MIN_ALLOC_PX, Math.min(allocResizeMaxPx, startH + (ev.clientY - startY))));
    }
    function onUp() { draggingAlloc.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [allocCollapsed, allocPx, allocResizeMaxPx]);

  const toggleResultsPanel = useCallback(() => {
    setFocusedInsightsSection(null);
    setResultsCollapsed((current) => !current);
  }, []);

  const toggleAllocationPanel = useCallback(() => {
    setFocusedInsightsSection(null);
    setAllocCollapsed((current) => !current);
  }, []);

  const toggleAdvisorPanel = useCallback(() => {
    setFocusedInsightsSection(null);
    setAdvisorCollapsed((current) => !current);
  }, []);

  const handleAllocationDetailOpenChange = useCallback((open: boolean) => {
    if (open) {
      setFocusedInsightsSection('alloc');
      setAllocCollapsed(false);
      setResultsCollapsed(true);
      setAdvisorCollapsed(true);
      return;
    }

    setFocusedInsightsSection((current) => (current === 'alloc' ? null : current));
  }, []);

  const handleAllocationNominalGapViolationChange = useCallback((hasViolation: boolean) => {
    if (!hasViolation) return;

    setAdvisorCollapsed(false);
    setFocusedInsightsSection((current) => (current === 'alloc' ? null : current));
  }, []);

  const handleAdvisorDetailOpenChange = useCallback((open: boolean) => {
    if (open) {
      setFocusedInsightsSection('advisor');
      setAdvisorCollapsed(false);
      setResultsCollapsed(true);
      setAllocCollapsed(true);
      return;
    }

    setFocusedInsightsSection((current) => (current === 'advisor' ? null : current));
  }, []);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">

        {/* ── LEFT: Workspace ── canvas + stack-up grid ─────────────────────── */}
        <div className="workspace-panel" ref={workAreaRef}>

          {/* Canvas — collapsible */}
          <div
            className="pane-label-bar"
            onClick={() => setCanvasCollapsed((v) => !v)}
            style={{ cursor: 'pointer' }}
          >
            <span className="pane-label-text">Canvas</span>
            <Icon name={canvasCollapsed ? 'chevron-down' : 'chevron-up'} size={12} className="pane-toggle-btn-icon" />
          </div>
          {!canvasCollapsed && (
            <>
              <div className="canvas-pane" style={{ height: `${canvasPct}%` }} data-tour="canvas">
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
          <div className="grid-pane" data-tour="grid">
            <StackGrid />
          </div>
        </div>

        {/* ── Center divider (col-resize) ──────────────────────────────────── */}
        <div className="panel-divider" onMouseDown={startRightResize} title="Drag to resize" />

        {/* ── RIGHT: Insights ── independent resizable sections ────────────── */}
        <div ref={insightsPanelRef} className="insights-panel" style={{ width: rightPanelPx }}>

          {/* 1. Design Intent — compact, auto height */}
          <div ref={intentSectionRef} className="rp-section rp-section-intent" data-tour="design-intent">
            <div className="rp-label-bar">
              <span className="rp-label-text">Design Intent</span>
            </div>
            <div className="rp-content rp-content-noscroll">
              <TargetPanel />
            </div>
          </div>

          {/* 2. Analysis Results — collapsible + resizable, divider at bottom */}
          <div
            className="rp-section"
            style={resultsCollapsed ? undefined : { height: boundedResultsPx }}
            data-tour="analysis-results"
          >
            <div
              className="rp-label-bar rp-label-bar-toggle"
              onClick={toggleResultsPanel}
              style={{ cursor: 'pointer' }}
            >
              <span className="rp-label-text">Analysis Results</span>
              <Icon name={resultsCollapsed ? 'chevron-down' : 'chevron-up'} size={12} className="pane-toggle-btn-icon" />
            </div>
            {!resultsCollapsed && (
              <div className="rp-content">
                <div ref={resultsContentRef} className="rp-content-measure">
                  <ResultsFooter />
                </div>
              </div>
            )}
          </div>
          <div
            className="rp-divider"
            onMouseDown={startResultsResize}
            title="Drag to resize"
          />

          {/* 3. Tolerance Allocation — collapsible + resizable, divider at bottom */}
          <div
            className={`rp-section ${allocationFocused ? 'rp-section-focus' : ''}`}
            style={
              allocCollapsed
                ? undefined
                : allocationFocused
                  ? { maxHeight: allocFocusMaxPx }
                  : { height: Math.min(allocPx, allocResizeMaxPx) }
            }
            data-tour="tolerance-allocation"
          >
            <div
              className="rp-label-bar rp-label-bar-toggle"
              onClick={toggleAllocationPanel}
              style={{ cursor: 'pointer' }}
            >
              <span className="rp-label-text">Tolerance Allocation</span>
              <Icon name={allocCollapsed ? 'chevron-down' : 'chevron-up'} size={12} className="pane-toggle-btn-icon" />
            </div>
            {!allocCollapsed && (
              <div className="rp-content">
                <div ref={allocContentRef} className="rp-content-measure">
                  <GoalSeekPanel
                    onDetailOpenChange={handleAllocationDetailOpenChange}
                    onNominalGapViolationChange={handleAllocationNominalGapViolationChange}
                  />
                </div>
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
            className={`rp-section rp-section-flex ${advisorFocused ? 'rp-section-focus' : ''}`}
            style={{
              minHeight: advisorCollapsed ? 0 : MIN_ADVISOR_PX,
              maxHeight: advisorCollapsed ? undefined : advisorFocusMaxPx,
            }}
            data-tour="nominal-advisor"
          >
            <div
              className="rp-label-bar rp-label-bar-toggle"
              onClick={toggleAdvisorPanel}
              style={{ cursor: 'pointer' }}
            >
              <span className="rp-label-text">Nominal Advisor</span>
              <Icon name={advisorCollapsed ? 'chevron-down' : 'chevron-up'} size={12} className="pane-toggle-btn-icon" />
            </div>
            {!advisorCollapsed && (
              <div className="rp-content">
                <div ref={advisorContentRef} className="rp-content-measure">
                  <NominalAdvisorPanel onDetailOpenChange={handleAdvisorDetailOpenChange} />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      <TutorialOverlay />
    </div>
  );
}
