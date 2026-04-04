import { useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { TargetType, TargetScenario } from '../../types/project';

const TARGET_TYPES: { value: TargetType; label: string; description: string }[] = [
  { value: 'clearance', label: 'Clearance', description: 'Gap must be ≥ min' },
  { value: 'interference', label: 'Interference', description: 'Gap between bounds (negative)' },
  { value: 'flush', label: 'Flush', description: 'Gap ≈ 0' },
  { value: 'proud', label: 'Proud', description: 'Gap > 0 (positive step)' },
  { value: 'recess', label: 'Recess', description: 'Gap < 0 (negative step)' },
];

/** Which gap fields each target type needs */
const TARGET_FIELDS: Record<TargetType, ('min' | 'max')[]> = {
  clearance: ['min'],
  interference: ['min', 'max'],
  flush: [],
  proud: ['min'],
  recess: ['max'],
};

export function TargetPanel() {
  const target = useProjectStore((s) => s.target);
  const setTarget = useProjectStore((s) => s.setTarget);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value as TargetType;
      const defaults: Record<TargetType, Partial<TargetScenario>> = {
        clearance: { minGap: '0', maxGap: null },
        interference: { minGap: '0', maxGap: '-0.01' },
        flush: { minGap: null, maxGap: null },
        proud: { minGap: '0.10', maxGap: null },
        recess: { minGap: null, maxGap: '-0.10' },
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

  const fields = TARGET_FIELDS[target.type];
  const showMin = fields.includes('min');
  const showMax = fields.includes('max');

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
        {showMin && (
          <label>
            Min Gap:
            <input
              type="text"
              value={target.minGap ?? ''}
              onChange={handleMinChange}
              placeholder="e.g. 0.05"
            />
          </label>
        )}
        {showMax && (
          <label>
            Max Gap:
            <input
              type="text"
              value={target.maxGap ?? ''}
              onChange={handleMaxChange}
              placeholder="e.g. -0.02"
            />
          </label>
        )}
        {!showMin && !showMax && (
          <span className="target-hint">No bounds — gap should be ≈ 0</span>
        )}
      </div>
    </div>
  );
}
