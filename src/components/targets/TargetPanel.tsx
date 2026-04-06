import { useCallback, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { TargetType, TargetScenario } from '../../types/project';
import { Tooltip } from '../ui/Tooltip';

const TARGET_TYPES: { value: TargetType; label: string; description: string; detail: string }[] = [
  {
    value: 'clearance',
    label: 'Clearance',
    description: 'Keep a positive minimum gap.',
    detail: 'Use this when two features must never touch. The worst-case stack-up needs to stay at or above your minimum open gap.',
  },
  {
    value: 'interference',
    label: 'Interference',
    description: 'Hold a controlled press fit window.',
    detail: 'Use this for intentional overlap or crush. Set the acceptable lower and upper limits for the fit you want to maintain.',
  },
  {
    value: 'flush',
    label: 'Flush',
    description: 'Center both surfaces around zero.',
    detail: 'Use this when two faces should land flush within a symmetric tolerance band, like 0 ± 0.05 mm.',
  },
  {
    value: 'proud',
    label: 'Proud',
    description: 'Feature must stand above the reference.',
    detail: 'Use this for positive reveal or step height. The stack-up must stay above your minimum proud amount.',
  },
  {
    value: 'recess',
    label: 'Recess',
    description: 'Feature must stay below the reference.',
    detail: 'Use this for countersink, setback, or inset conditions. The stack-up must not rise above your recess limit.',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Define both lower and upper bounds.',
    detail: 'Use this when the acceptance window does not fit the standard intent patterns. Enter the exact lower and upper limits manually.',
  },
];

const TARGET_DEFAULTS: Record<TargetType, Partial<TargetScenario>> = {
  clearance: { minGap: '0', maxGap: null },
  interference: { minGap: '0', maxGap: '-0.01' },
  flush: { minGap: '-0.05', maxGap: '0.05' },
  proud: { minGap: '0.10', maxGap: null },
  recess: { minGap: null, maxGap: '-0.10' },
  custom: { minGap: '-0.10', maxGap: '0.10' },
};

/** Which gap fields each target type needs */
type FieldConfig = { kind: 'min' } | { kind: 'max' } | { kind: 'min+max' } | { kind: 'flush' } | { kind: 'custom' } | { kind: 'none' };

const TARGET_FIELDS: Record<TargetType, FieldConfig> = {
  clearance: { kind: 'min' },
  interference: { kind: 'min+max' },
  flush: { kind: 'flush' },
  proud: { kind: 'min' },
  recess: { kind: 'max' },
  custom: { kind: 'custom' },
};

/** For flush, derive the ± tolerance value from minGap/maxGap */
function getFlushTol(target: TargetScenario): string {
  if (target.maxGap !== null) return target.maxGap;
  if (target.minGap !== null) return String(Math.abs(parseFloat(target.minGap)));
  return '';
}

function DesignIntentIcon({ type }: { type: TargetType }) {
  switch (type) {
    case 'clearance':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5.5" width="5" height="13" rx="1.5" />
          <rect x="16" y="5.5" width="5" height="13" rx="1.5" />
          <path d="M10 12h4M10 12l1.6-1.6M10 12l1.6 1.6M14 12l-1.6-1.6M14 12l-1.6 1.6" />
        </svg>
      );
    case 'interference':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5.5" width="8" height="13" rx="1.5" />
          <rect x="13" y="5.5" width="8" height="13" rx="1.5" />
          <path d="M8.5 12h7M10.5 10.4L8.9 12l1.6 1.6M13.5 10.4L15.1 12l-1.6 1.6" />
        </svg>
      );
    case 'flush':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="6" width="7" height="12" rx="1.5" />
          <rect x="14" y="6" width="7" height="12" rx="1.5" />
          <path d="M12 4.5v15M10 9.5h4M10 14.5h4" />
        </svg>
      );
    case 'proud':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 18V8h7v10" />
          <path d="M13 18V5h7v13" />
          <path d="M11 9h2M13 9l-1.2-1.2M13 9l-1.2 1.2" />
        </svg>
      );
    case 'recess':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 18V5h7v13" />
          <path d="M13 18V8h7v10" />
          <path d="M11 9h2M11 9l1.2-1.2M11 9l1.2 1.2" />
        </svg>
      );
    case 'custom':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 5v14M5 5h3M5 19h3M19 5v14M16 5h3M16 19h3" />
          <path d="M9 9h6M9 15h4" />
          <circle cx="15" cy="9" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="13" cy="15" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export function TargetPanel() {
  const target = useProjectStore((s) => s.target);
  const setTarget = useProjectStore((s) => s.setTarget);

  // Raw string for the flush ± input while the user is actively typing.
  // This allows intermediate values like "0." or "0.0" without the store
  // round-tripping through parseFloat and discarding the trailing characters.
  const [flushRaw, setFlushRaw] = useState<string | null>(null);

  const handleTypeChange = useCallback(
    (type: TargetType) => {
      setFlushRaw(null);
      setTarget({ type, ...TARGET_DEFAULTS[type] } as TargetScenario);
    },
    [setTarget],
  );

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTarget({ ...target, minGap: e.target.value || null });
    },
    [target, setTarget],
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTarget({ ...target, maxGap: e.target.value || null });
    },
    [target, setTarget],
  );

  /** Flush ± tol: single input that sets minGap = -val, maxGap = +val */
  const handleFlushTolChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Keep the raw string in local state so intermediate values like "0."
      // or "0.05" are not lost when the store round-trips through parseFloat.
      setFlushRaw(raw);
      const val = parseFloat(raw);
      if (raw === '' || isNaN(val)) {
        setTarget({ ...target, minGap: null, maxGap: null });
      } else {
        const abs = Math.abs(val);
        setTarget({ ...target, minGap: String(-abs), maxGap: String(abs) });
      }
    },
    [target, setTarget],
  );

  const handleFlushTolBlur = useCallback(() => {
    // Discard the local raw string — the stored maxGap is now the source of truth.
    setFlushRaw(null);
  }, []);

  const field = TARGET_FIELDS[target.type];

  return (
    <div className="target-panel">
      <div className="target-type-grid" role="radiogroup" aria-label="Design intent">
        {TARGET_TYPES.map((option, index) => {
          const selected = option.value === target.type;
          return (
            <Tooltip
              key={option.value}
              content={option.detail}
              placement={index < 3 ? 'bottom' : 'top'}
            >
              <button
                type="button"
                className={`target-type-card${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={() => handleTypeChange(option.value)}
              >
                <span className="target-type-icon" aria-hidden="true">
                  <DesignIntentIcon type={option.value} />
                </span>
                <span className="target-type-copy">
                  <span className="target-type-label">{option.label}</span>
                  <span className="target-type-description">{option.description}</span>
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="target-fields">
        {field.kind === 'min' && (
          <label>
            Min Gap:
            <input type="text" value={target.minGap ?? ''} onChange={handleMinChange} placeholder="e.g. 0.05" />
          </label>
        )}

        {field.kind === 'max' && (
          <label>
            Max Gap:
            <input type="text" value={target.maxGap ?? ''} onChange={handleMaxChange} placeholder="e.g. -0.02" />
          </label>
        )}

        {field.kind === 'min+max' && (
          <>
            <label>
              Min Gap:
              <input type="text" value={target.minGap ?? ''} onChange={handleMinChange} placeholder="e.g. 0" />
            </label>
            <label>
              Max Gap:
              <input type="text" value={target.maxGap ?? ''} onChange={handleMaxChange} placeholder="e.g. -0.01" />
            </label>
          </>
        )}

        {field.kind === 'flush' && (
          <label>
            Flush ± Tol:
            <input
              type="text"
              value={flushRaw !== null ? flushRaw : getFlushTol(target)}
              onChange={handleFlushTolChange}
              onBlur={handleFlushTolBlur}
              placeholder="e.g. 0.05"
            />
            <span className="target-hint">Acceptable range: 0 ± this value</span>
          </label>
        )}

        {field.kind === 'custom' && (
          <>
            <label>
              Lower Bound:
              <input type="text" value={target.minGap ?? ''} onChange={handleMinChange} placeholder="e.g. -0.10" />
            </label>
            <label>
              Upper Bound:
              <input type="text" value={target.maxGap ?? ''} onChange={handleMaxChange} placeholder="e.g. 0.10" />
            </label>
          </>
        )}
      </div>
    </div>
  );
}
