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
      else setRect(null);
    }

    // Small delay so the DOM has time to paint after step change
    const t = setTimeout(measure, 60);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
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

  // Reset row/vector count refs when step changes
  useEffect(() => {
    prevRowCountRef.current = rows.length;
    prevVectorCountRef.current = canvasData.vectors.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Watch for user interactions that advance interactive steps
  useEffect(() => {
    if (!active || !stepData?.interactive) return;

    if (stepData.trigger === 'row-added' && rows.length > prevRowCountRef.current) {
      markInteractionDone();
    }
    if (stepData.trigger === 'vector-drawn' && canvasData.vectors.length > prevVectorCountRef.current) {
      markInteractionDone();
    }
  }, [active, stepData, rows.length, canvasData.vectors.length, markInteractionDone]);

  // Auto-advance once interaction is done (after short delay)
  useEffect(() => {
    if (!interactionDone) return;
    const timer = setTimeout(() => next(), 900);
    return () => clearTimeout(timer);
  }, [interactionDone, next]);

  if (!active || !stepData) return null;

  const isCentered = stepData.target === null || stepData.placement === 'center';
  const hasSpotlight = !isCentered && rect !== null;
  const canGoNext = !stepData.interactive || interactionDone;
  const isLast = step === TOTAL_STEPS - 1;

  // ── Spotlight ring ───────────────────────────────────────────────────────
  const PADDING = 8;
  const spotStyle: React.CSSProperties | null = hasSpotlight && rect
    ? {
        position: 'fixed',
        top: rect.top - PADDING,
        left: rect.left - PADDING,
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
        borderRadius: 6,
        border: '2px solid var(--accent)',
        zIndex: 60001,
        pointerEvents: 'none',
        transition: 'all 0.3s ease',
        boxSizing: 'border-box',
      }
    : null;

  // ── Bubble position ──────────────────────────────────────────────────────
  let bubbleStyle: React.CSSProperties;

  if (isCentered || !rect) {
    // Center of screen fallback for all cases where we have no target rect
    bubbleStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 60002,
    };
  } else {
    const GAP = 20;
    switch (stepData.placement) {
      case 'left':
        bubbleStyle = {
          position: 'fixed',
          top: Math.max(16, Math.min(window.innerHeight - 400, rect.top + rect.height / 2)),
          left: rect.left - GAP,
          transform: 'translate(-100%, -50%)',
          zIndex: 60002,
        };
        break;
      case 'right':
        bubbleStyle = {
          position: 'fixed',
          top: Math.max(16, Math.min(window.innerHeight - 400, rect.top + rect.height / 2)),
          left: rect.right + GAP,
          transform: 'translateY(-50%)',
          zIndex: 60002,
        };
        break;
      case 'top':
        bubbleStyle = {
          position: 'fixed',
          top: rect.top - GAP,
          left: Math.max(16, Math.min(window.innerWidth - 340, rect.left + rect.width / 2)),
          transform: 'translate(-50%, -100%)',
          zIndex: 60002,
        };
        break;
      case 'bottom':
      default:
        bubbleStyle = {
          position: 'fixed',
          top: rect.bottom + GAP,
          left: Math.max(16, Math.min(window.innerWidth - 340, rect.left + rect.width / 2)),
          transform: 'translateX(-50%)',
          zIndex: 60002,
        };
    }
  }

  return createPortal(
    <>
      {/* Always-visible semi-transparent backdrop */}
      <div
        className={`tour-backdrop ${hasSpotlight ? 'tour-backdrop-spotlight' : ''}`}
      />

      {/* Spotlight cutout — drawn as 4 rects around the target, not box-shadow */}
      {hasSpotlight && rect && (
        <>
          {/* top strip */}
          <div style={{ position: 'fixed', inset: 0, top: 0, height: rect.top - PADDING, background: 'rgba(0,0,0,0.55)', zIndex: 59999, pointerEvents: 'none' }} />
          {/* bottom strip */}
          <div style={{ position: 'fixed', inset: 0, top: rect.bottom + PADDING, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 59999, pointerEvents: 'none' }} />
          {/* left strip */}
          <div style={{ position: 'fixed', top: rect.top - PADDING, left: 0, width: rect.left - PADDING, height: rect.height + PADDING * 2, background: 'rgba(0,0,0,0.55)', zIndex: 59999, pointerEvents: 'none' }} />
          {/* right strip */}
          <div style={{ position: 'fixed', top: rect.top - PADDING, left: rect.right + PADDING, right: 0, height: rect.height + PADDING * 2, background: 'rgba(0,0,0,0.55)', zIndex: 59999, pointerEvents: 'none' }} />
        </>
      )}

      {/* Accent border ring around target */}
      {spotStyle && <div style={spotStyle} />}

      {/* Tutorial bubble */}
      <div className="tour-bubble" style={bubbleStyle}>
        <button className="tour-close" onClick={finish} title="Skip tutorial">
          <Icon name="x" size={12} />
        </button>
        <div className="tour-step-label">Step {step + 1} of {TOTAL_STEPS}</div>
        <h3 className="tour-title">{stepData.title}</h3>
        <p className="tour-body">{stepData.body}</p>

        {stepData.interactive && !interactionDone && (
          <div className="tour-interaction-hint">
            <span className="tour-pulse" />
            {stepData.interactionHint}
          </div>
        )}
        {interactionDone && (
          <div className="tour-interaction-done">✓ Done! Moving on…</div>
        )}

        <div className="tour-nav">
          <ProgressDots total={TOTAL_STEPS} current={step} />
          <div className="tour-nav-btns">
            {step > 0 && (
              <button className="tour-btn tour-btn-secondary" onClick={prev}>← Back</button>
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
