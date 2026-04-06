/**
 * Lightweight portal-based tooltip — shows on hover after 280ms delay.
 * Renders at document.body via createPortal so it always escapes overflow clips.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

export function Tooltip({ content, placement = 'bottom', children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const OFFSET = 8;

  const show = useCallback((el: HTMLElement) => {
    timerRef.current = setTimeout(() => {
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
    setVisible(false);
    setPos(null);
  }, []);

  // Clean up on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Clone child and attach mouse handlers
  const child = children as React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  const cloned = {
    ...child,
    props: {
      ...child.props,
      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
        anchorRef.current = e.currentTarget;
        show(e.currentTarget);
        child.props.onMouseEnter?.(e);
      },
      onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
        hide();
        child.props.onMouseLeave?.(e);
      },
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        anchorRef.current = e.currentTarget;
        show(e.currentTarget);
        (child.props as React.HTMLAttributes<HTMLElement>).onFocus?.(e);
      },
      onBlur: (e: React.FocusEvent<HTMLElement>) => {
        hide();
        (child.props as React.HTMLAttributes<HTMLElement>).onBlur?.(e);
      },
    },
  } as React.ReactElement;

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
