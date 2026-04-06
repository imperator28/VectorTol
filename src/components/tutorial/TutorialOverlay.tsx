import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTutorialStore, TOTAL_STEPS } from '../../store/tutorialStore';
import { useProjectStore } from '../../store/projectStore';
import { TUTORIAL_STEPS, DEMO_ROWS, DEMO_TARGET, DEMO_METADATA } from './tutorialData';
import { Icon } from '../ui/Icon';
import { v4 as uuidv4 } from 'uuid';

function useTargetRect(target: string | null, step: number) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!target) { setRect(null); return; }

    function measure() {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    }

    measure();
    // Re-measure on resize
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [target, step]);

  return rect;
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="tour-dots">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`tour-dot ${i === current ? 'tour-dot-active' : i < current ? 'tour-dot-done' : ''}`}
        />
      ))}
    </div>
  );
}

export function TutorialOverlay() {
  const { active, step, interactionDone, next, prev, finish, markInteractionDone } = useTutorialStore();
  const loadProject = useProjectStore((s) => s.loadProject);
  const rows = useProjectStore((s) => s.rows);
  const canvasData = useProjectStore((s) => s.canvasData);
  const prevRowCountRef = useRef(rows.length);
  const prevVectorCountRef = useRef(canvasData.vectors.length);

  const stepData = TUTORIAL_STEPS[step];
  const rect = useTargetRect(stepData?.target ?? null, step);

  // Step 0: load demo data when tutorial starts
  useEffect(() => {
    if (active && step === 0) {
      const demoRows = DEMO_ROWS.map((r) => ({ ...r, id: uuidv4() }));
      loadProject(DEMO_METADATA as any, demoRows, DEMO_TARGET, null);
    }
  }, [active, step, loadProject]);

  // Watch for user interactions that advance interactive steps
  useEffect(() => {
    if (!active || !stepData?.interactive) return;

    if (stepData.trigger === 'row-added') {
      if (rows.length > prevRowCountRef.current) {
        markInteractionDone();
      }
      prevRowCountRef.current = rows.length;
    }

    if (stepData.trigger === 'vector-drawn') {
      if (canvasData.vectors.length > prevVectorCountRef.current) {
        markInteractionDone();
      }
      prevVectorCountRef.current = canvasData.vectors.length;
    }
  }, [active, stepData, rows.length, canvasData.vectors.length, markInteractionDone]);

  // Auto-advance once interaction is done (after short delay)
  useEffect(() => {
    if (!interactionDone) return;
    const timer = setTimeout(() => next(), 800);
    return () => clearTimeout(timer);
  }, [interactionDone, next]);

  if (!active || !stepData) return null;

  const isCentered = stepData.target === null || stepData.placement === 'center';
  const canGoNext = !stepData.interactive || interactionDone;
  const isLast = step === TOTAL_STEPS - 1;

  // ── Spotlight ring ───────────────────────────────────────────────────────
  const PADDING = 6;
  const spotStyle = rect
    ? {
        position: 'fixed' as const,
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
        borderRadius: 6,
        boxShadow: '0 0 0 4000px rgba(0,0,0,0.55)',
        border: '2px solid var(--accent)',
        zIndex: 59999,
        pointerEvents: 'none' as const,
        transition: 'all 0.25s ease',
      }
    : null;

  // ── Bubble position ──────────────────────────────────────────────────────
  let bubbleStyle: React.CSSProperties = {};
  if (isCentered) {
    bubbleStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 60000,
    };
  } else if (rect) {
    const GAP = 18;
    switch (stepData.placement) {
      case 'left':
        bubbleStyle = {
          position: 'fixed',
          top: rect.top + rect.height / 2,
          left: rect.left - GAP,
          transform: 'translate(-100%, -50%)',
          zIndex: 60000,
        };
        break;
      case 'right':
        bubbleStyle = {
          position: 'fixed',
          top: rect.top + rect.height / 2,
          left: rect.right + GAP,
          transform: 'translateY(-50%)',
          zIndex: 60000,
        };
        break;
      case 'top':
        bubbleStyle = {
          position: 'fixed',
          top: rect.top - GAP,
          left: rect.left + rect.width / 2,
          transform: 'translate(-50%, -100%)',
          zIndex: 60000,
        };
        break;
      case 'bottom':
      default:
        bubbleStyle = {
          position: 'fixed',
          top: rect.bottom + GAP,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
          zIndex: 60000,
        };
    }
  }

  return createPortal(
    <>
      {/* Dark backdrop — only shown when centered (no target element) */}
      {isCentered && (
        <div className="tour-backdrop" onClick={undefined} />
      )}

      {/* Spotlight ring around targeted element */}
      {spotStyle && <div style={spotStyle} />}

      {/* Tooltip bubble */}
      <div className="tour-bubble" style={bubbleStyle}>
        {/* Close button */}
        <button className="tour-close" onClick={finish} title="Skip tutorial">
          <Icon name="x" size={12} />
        </button>

        {/* Step counter */}
        <div className="tour-step-label">
          Step {step + 1} of {TOTAL_STEPS}
        </div>

        {/* Content */}
        <h3 className="tour-title">{stepData.title}</h3>
        <p className="tour-body">{stepData.body}</p>

        {/* Interaction hint */}
        {stepData.interactive && !interactionDone && (
          <div className="tour-interaction-hint">
            <span className="tour-pulse" />
            {stepData.interactionHint}
          </div>
        )}
        {interactionDone && (
          <div className="tour-interaction-done">
            ✓ Done! Moving on…
          </div>
        )}

        {/* Navigation */}
        <div className="tour-nav">
          <ProgressDots total={TOTAL_STEPS} current={step} />
          <div className="tour-nav-btns">
            {step > 0 && (
              <button className="tour-btn tour-btn-secondary" onClick={prev}>
                ← Back
              </button>
            )}
            {canGoNext && (
              <button className="tour-btn tour-btn-primary" onClick={isLast ? finish : next}>
                {isLast ? 'Start working ✓' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
