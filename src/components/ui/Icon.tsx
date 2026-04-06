/**
 * Minimal flat icon set — Lucide-inspired, stroke-based SVGs.
 * All icons render at 16×16 by default with 1.5px strokes.
 */

const PATHS: Record<string, string> = {
  // File operations
  'file-plus':
    'M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM12 2v4H8M10 10v4M8 12h4',
  'folder-open':
    'M4 4h4l2 2h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM3 8h14',
  save:
    'M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2ZM17 21v-8H7v8M7 3v5h8',
  // Row operations
  'row-plus': 'M12 5v14M5 12h14',
  'row-minus': 'M5 12h14',
  // Export
  'file-pdf': 'M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM12 2v4H8M7 13h2M7 10h6M7 16h4',
  'file-table': 'M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM12 2v4H8M4 10h12M4 14h12M10 7v10',
  'file-code': 'M14 2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2ZM12 2v4H8M9 13l-2-2 2-2M13 9l2 2-2 2',
  // Theme
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  // Canvas tools
  cursor: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3Z',
  pen: 'M12 19l7-7 3 3-7 7-3-3ZM18 12l-1.5-1.5M2 22l1-6 12.5-12.5 3 3L6 19l-4 3Z',
  undo: 'M3 7v6h6M3 13A9 9 0 1 0 6.2 5.2',
  redo: 'M21 7v6h-6M21 13A9 9 0 1 1 17.8 5.2',
  lock: 'M5 11h14v9H5v-9ZM7 11V7a5 5 0 0 1 10 0v4',
  unlock: 'M5 11h14v9H5v-9ZM7 11V7a5 5 0 0 1 9.9-1',
  magnet: 'M7 2v11a5 5 0 0 0 10 0V2M7 2h4M13 2h4',
  snap: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14ZM12 1v4M12 19v4M1 12h4M19 12h4',
  'flip-h': 'M8 3H4v18h4M16 3h4v18h-4M12 6v12M9 9l3-3 3 3M9 15l3 3 3-3',
  image: 'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2ZM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM21 15l-5-5L5 21',
  // UI
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M18 15l-6-6-6 6',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  // Swiss cross (bold +)
  swiss: 'M9 3h6v7h7v6h-7v7H9v-7H2v-6h7V3Z',
  // Pane toggle
  'panel-top': 'M3 3h18v18H3V3ZM3 9h18',
  'panel-bottom': 'M3 3h18v18H3V3ZM3 15h18',
  maximize: 'M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3',
  'help-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
};

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 16, className, style }: IconProps) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d={d} />
    </svg>
  );
}
