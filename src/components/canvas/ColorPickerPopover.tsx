import { useRef, useEffect } from 'react';

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
}

export function ColorPickerPopover({ currentColor, onChange, onClose, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  return (
    <div className="color-picker-popover" ref={ref}>
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
    </div>
  );
}
