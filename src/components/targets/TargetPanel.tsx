import { useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { TargetType, TargetScenario } from '../../types/project';

const TARGET_TYPES: { value: TargetType; label: string; description: string }[] = [
  { value: 'clearance', label: 'Clearance', description: 'Gap must be ≥ min' },
  { value: 'interference', label: 'Interference', description: 'Gap between bounds (negative)' },
  { value: 'flush', label: 'Flush', description: 'Gap ≈ 0 ± tolerance' },
  { value: 'proud', label: 'Proud', description: 'Gap > 0 (positive step)' },
  { value: 'recess', label: 'Recess', description: 'Gap < 0 (negative step)' },
  { value: 'custom', label: 'Custom', description: 'User-defined upper and lower bounds' },
];

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

export function TargetPanel() {
  const target = useProjectStore((s) => s.target);
  const setTarget = useProjectStore((s) => s.setTarget);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value as TargetType;
      const defaults: Record<TargetType, Partial<TargetScenario>> = {
        clearance: { minGap: '0', maxGap: null },
        interference: { minGap: '0', maxGap: '-0.01' },
        flush: { minGap: '-0.05', maxGap: '0.05' },
        proud: { minGap: '0.10', maxGap: null },
        recess: { minGap: null, maxGap: '-0.10' },
        custom: { minGap: '-0.10', maxGap: '0.10' },
      };
      setTarget({ type, ...defaults[type] } as TargetScenario);
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

  const field = TARGET_FIELDS[target.type];

  return (
    <div className="target-panel">
      <h3>Design Intent</h3>
      <div className="target-fields">
        <label>
          Type:
          <select value={target.type} onChange={handleTypeChange}>
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value} title={t.description}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

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
              value={getFlushTol(target)}
              onChange={handleFlushTolChange}
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
