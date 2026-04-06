/**
 * Lightweight portal-based tooltip — shows on hover after 280ms delay.
 * Renders at document.body via createPortal so it always escapes overflow clips.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cloneElement } from 'react';

let activeTooltipOwner: symbol | null = null;
let activeTooltipHide: (() => void) | null = null;

interface TooltipProps {
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

export function Tooltip({ content, placement = 'bottom', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const ownerRef = useRef(Symbol('tooltip'));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideRef = useRef<() => void>(() => {});
  const OFFSET = 8;

  const releaseActiveTooltip = useCallback(() => {
    if (activeTooltipOwner === ownerRef.current) {
      activeTooltipOwner = null;
      activeTooltipHide = null;
    }
  }, []);

  const show = useCallback((el: HTMLElement) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (activeTooltipOwner !== ownerRef.current) {
        activeTooltipHide?.();
      }
      activeTooltipOwner = ownerRef.current;
      activeTooltipHide = hideRef.current;
      const r = el.getBoundingClientRect();
      let top = 0;
      let left = 0;
      switch (placement) {
        case 'top':
          top = r.top - OFFSET;
          left = r.left + r.width / 2;
          break;
        case 'bottom':
          top = r.bottom + OFFSET;
          left = r.left + r.width / 2;
          break;
        case 'left':
          top = r.top + r.height / 2;
          left = r.left - OFFSET;
          break;
        case 'right':
          top = r.top + r.height / 2;
          left = r.right + OFFSET;
          break;
      }
      setPos({ top, left });
      setVisible(true);
    }, 280);
  }, [placement]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    releaseActiveTooltip();
    setVisible(false);
    setPos(null);
  }, [releaseActiveTooltip]);

  hideRef.current = hide;

  // Clean up on unmount
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    releaseActiveTooltip();
  }, [releaseActiveTooltip]);

  useEffect(() => {
    if (!visible) return;

    const handlePointerDown = () => hide();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    window.addEventListener('keydown', handleEscape, true);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [hide, visible]);

  if (!content) return children;

  // Clone child and attach hover/focus handlers
  const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  const cloned = cloneElement(child, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      anchorRef.current = e.currentTarget;
      show(e.currentTarget);
      child.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      hide();
      child.props.onMouseLeave?.(e);
    },
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      anchorRef.current = e.currentTarget;
      show(e.currentTarget);
      (child.props as React.HTMLAttributes<HTMLElement>).onPointerEnter?.(e);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      hide();
      (child.props as React.HTMLAttributes<HTMLElement>).onPointerLeave?.(e);
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      hide();
      (child.props as React.HTMLAttributes<HTMLElement>).onPointerDown?.(e);
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.matches(':focus-visible')) {
        (child.props as React.HTMLAttributes<HTMLElement>).onFocus?.(e);
        return;
      }
      anchorRef.current = e.currentTarget;
      show(e.currentTarget);
      (child.props as React.HTMLAttributes<HTMLElement>).onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      hide();
      (child.props as React.HTMLAttributes<HTMLElement>).onBlur?.(e);
    },
  });

  const placementClass = `tooltip-bubble tooltip-${placement}`;

  return (
    <>
      {cloned}
      {visible && pos && createPortal(
        <div
          className={placementClass}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          role="tooltip"
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
}
