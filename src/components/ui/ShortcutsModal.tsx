import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

const SHORTCUTS = [
  { section: 'Canvas Tools' },
  { key: 'V', action: 'Select / move vectors' },
  { key: 'D', action: 'Draw vector tool' },
  { key: 'L', action: 'Toggle direction lock (H/V only)' },
  { key: 'S', action: 'Toggle magnetic snap to endpoints' },
  { key: 'Shift (hold while drawing)', action: 'Lock direction to H or V for that stroke' },
  { section: 'Navigation' },
  { key: 'Middle mouse (hold)', action: 'Pan — CAD-style' },
  { key: 'Scroll wheel', action: 'Zoom in / out' },
  { section: 'Editing' },
  { key: 'Delete / Backspace', action: 'Remove selected vector + its grid row' },
  { key: 'Escape', action: 'Cancel draw / deselect' },
  { key: 'Ctrl+Z', action: 'Undo (50-step history)' },
  { key: 'Ctrl+Y  /  Ctrl+Shift+Z', action: 'Redo' },
  { section: 'App' },
  { key: '?', action: 'Open this shortcuts reference' },
];

interface Props {
  onClose: () => void;
}

export function ShortcutsModal({ onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="shortcuts-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2 className="shortcuts-title">Keyboard Shortcuts</h2>
          <button className="shortcuts-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="shortcuts-body">
          {SHORTCUTS.map((item, i) => {
            if ('section' in item && !('key' in item)) {
              return (
                <div key={i} className="shortcuts-section-header">{item.section}</div>
              );
            }
            return (
              <div key={i} className="shortcuts-row">
                <kbd className="shortcuts-kbd">{(item as { key: string; action: string }).key}</kbd>
                <span className="shortcuts-action">{(item as { key: string; action: string }).action}</span>
              </div>
            );
          })}
        </div>
        <div className="shortcuts-footer">
          Press <kbd className="shortcuts-kbd shortcuts-kbd-sm">?</kbd> anytime to reopen this panel
        </div>
      </div>
    </div>,
    document.body,
  );
}
