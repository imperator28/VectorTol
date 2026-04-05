import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export const MAC_PALETTE = [
  { name: 'Red',    value: '#FF3B30' },
  { name: 'Orange', value: '#FF9500' },
  { name: 'Yellow', value: '#FFCC00' },
  { name: 'Green',  value: '#34C759' },
  { name: 'Mint',   value: '#00C7BE' },
  { name: 'Teal',   value: '#30B0C7' },
  { name: 'Cyan',   value: '#32ADE6' },
  { name: 'Blue',   value: '#007AFF' },
  { name: 'Indigo', value: '#5856D6' },
  { name: 'Purple', value: '#AF52DE' },
  { name: 'Pink',   value: '#FF2D55' },
  { name: 'Brown',  value: '#A2845E' },
  { name: 'Gray',   value: '#8E8E93' },
  { name: 'Black',  value: '#1C1C1E' },
  { name: 'White',  value: '#F2F2F7' },
];

interface Props {
  currentColor: string;
  onChange: (color: string) => void;
  onClose: () => void;
  label: string;
  /** The button element the picker is anchored to — used for portal positioning */
  anchorEl: HTMLElement | null;
}

export function ColorPickerPopover({ currentColor, onChange, onClose, label, anchorEl }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Calculate portal position from the anchor button
  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({
      top: r.bottom + 8,
      left: Math.min(r.left, window.innerWidth - 224),
    });
  }, [anchorEl]);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      const inPopover = ref.current?.contains(target);
      const inAnchor = anchorEl?.contains(target);
      if (!inPopover && !inAnchor) onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose, anchorEl]);

  if (!pos) return null;

  return createPortal(
    <div
      className="color-picker-popover"
      ref={ref}
      style={{ position: 'fixed', top: pos.top, left: pos.left }}
    >
      <div className="color-picker-label">{label}</div>
      <div className="color-palette">
        {MAC_PALETTE.map((c) => (
          <button
            key={c.value}
            className={`color-swatch${currentColor.toLowerCase() === c.value.toLowerCase() ? ' color-swatch-active' : ''}`}
            style={{ background: c.value }}
            title={c.name}
            onClick={() => { onChange(c.value); onClose(); }}
          />
        ))}
      </div>
      <div className="color-picker-custom">
        <span>Custom:</span>
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          title="Pick any color"
        />
        <span className="color-picker-hex">{currentColor.toUpperCase()}</span>
      </div>
    </div>,
    document.body,
  );
}
