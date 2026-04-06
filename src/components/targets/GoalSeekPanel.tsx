import { useMemo, useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import { runSmartAllocation } from '../../engine/standards';
import type { AllocationStrategy, RowChange, SmartAllocationResult } from '../../engine/standards';
import type { StackRow } from '../../types/grid';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, dp = 4): string {
  return `±${Math.abs(n).toFixed(dp)}`;
}

function PassBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span className={`gs-badge ${pass ? 'gs-badge-pass' : 'gs-badge-fail'}`}>
      {pass ? '✓' : '✗'} {label}
    </span>
  );
}

/** Compute the store update for a single RowChange */
function changeToUpdate(change: RowChange): Partial<StackRow> {
  if (change.applyTolPlus !== undefined && change.applyTolMinus !== undefined) {
    // Asymmetric: store as explicit +/− tolerances; clear symmetric
    return {
      tolSymmetric: null,
      tolPlus: String(change.applyTolPlus),
      tolMinus: String(change.applyTolMinus),
    };
  }
  // Symmetric
  const t = change.toTol;
  return {
    tolSymmetric: String(t),
    tolPlus: String(t),
    tolMinus: String(-t),
  };
}

// ── strategy card ─────────────────────────────────────────────────────────────

function StrategyCard({
  strategy,
  open,
  onToggle,
  onApplyRow,
  onApplyAll,
}: {
  strategy: AllocationStrategy;
  open: boolean;
  onToggle: () => void;
  onApplyRow: (change: RowChange) => void;
  onApplyAll: (strategy: AllocationStrategy) => void;
}) {
  const strategyIcon: Record<AllocationStrategy['id'], string> = {
    proportional: '⚖',
    'top-contributors': '🎯',
    'grade-step': '📐',
    'asymmetric-shift': '↔',
    relaxation: '💰',
  };

  return (
    <div
      className={[
        'gs-strategy',
        open ? 'gs-strategy-open' : '',
        strategy.feasible ? 'gs-strategy-feasible' : 'gs-strategy-infeasible',
        strategy.recommended ? 'gs-strategy-recommended' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Header row */}
      <button className="gs-strategy-header" onClick={onToggle}>
        <span className="gs-strategy-icon">{strategyIcon[strategy.id]}</span>
        <span className="gs-strategy-label">
          {strategy.label}
          {strategy.recommended && (
            <span className="gs-recommended-badge">Recommended</span>
          )}
        </span>
        <span className="gs-strategy-arrow">{open ? '▴' : '▾'}</span>
      </button>

      {/* Quick summary — always visible */}
      <div className="gs-strategy-summary">
        {strategy.feasible ? (
          <>
            <span className="gs-strategy-wc">WC: {fmt(strategy.newWcTol)}</span>
            <PassBadge pass={strategy.wcPassAfter} label="WC" />
            <PassBadge pass={strategy.rssPassAfter} label="RSS" />
          </>
        ) : (
          <span className="gs-infeasible-note">
            ⚠ {strategy.infeasibleReason ?? 'Not feasible with current processes'}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="gs-strategy-detail">
          <p className="gs-strategy-desc">{strategy.description}</p>

          {strategy.rowChanges.length > 0 ? (
            <>
              <table className="gs-change-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>From</th>
                    <th>To</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {strategy.rowChanges.map((c) => (
                    <tr key={c.rowId}>
                      <td
                        className="gs-part-name"
                        title={`${c.component} ${c.dimId}`}
                      >
                        {c.component || c.dimId || '—'}
                      </td>
                      <td className="gs-num">
                        {fmt(c.fromTol)}
                        {c.fromITGrade && (
                          <span className="gs-grade">{c.fromITGrade}</span>
                        )}
                      </td>
                      <td className={`gs-num ${c.isLoosen ? 'gs-loosen' : 'gs-tighten'}`}>
                        {Math.abs(c.nominalShift) > 0.0001 ? (
                          <span className="gs-asym-label" title={c.note}>
                            {c.applyTolPlus !== undefined
                              ? `+${c.applyTolPlus.toFixed(4)}/−${Math.abs(c.applyTolMinus ?? 0).toFixed(4)}`
                              : c.note}
                          </span>
                        ) : (
                          <>
                            {fmt(c.toTol)}
                            {c.toITGrade && (
                              <span className="gs-grade">{c.toITGrade}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="gs-apply-cell">
                        <button
                          className="gs-apply-btn"
                          onClick={() => onApplyRow(c)}
                          title="Apply this suggestion to the row"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Apply-all button */}
              <div className="gs-apply-all-row">
                <button
                  className="gs-apply-all-btn"
                  onClick={() => onApplyAll(strategy)}
                  title="Apply all suggestions in this strategy at once"
                >
                  ✓ Apply All ({strategy.rowChanges.length})
                </button>
              </div>
            </>
          ) : (
            <p className="gs-no-changes">No rows require adjustment.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function GoalSeekPanel({
  onDetailOpenChange,
  onNominalGapViolationChange,
}: {
  onDetailOpenChange?: (open: boolean) => void;
  onNominalGapViolationChange?: (hasViolation: boolean) => void;
}) {
  const rows      = useProjectStore((s) => s.rows);
  const target    = useProjectStore((s) => s.target);
  const updateRow = useProjectStore((s) => s.updateRow);
  const standards = useSettingsStore((s) => s.config.standards);
  const [openStrategyId, setOpenStrategyId] = useState<AllocationStrategy['id'] | null>(null);

  const seekInput = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        component: r.component,
        dimId: r.dimId,
        source: r.toleranceSource,
        direction: r.direction,
        nominal: r.nominal,
        tolSymmetric: r.tolSymmetric,
        tolPlus: r.tolPlus,
        tolMinus: r.tolMinus,
        sigma: r.sigma,
      })),
    [rows],
  );

  const result: SmartAllocationResult = useMemo(
    () => runSmartAllocation(seekInput, target, standards),
    [seekInput, target, standards],
  );

  useEffect(() => {
    if (openStrategyId && !result.strategies.some((strategy) => strategy.id === openStrategyId)) {
      setOpenStrategyId(null);
    }
  }, [openStrategyId, result.strategies]);

  const handleApplyRow = useCallback(
    (change: RowChange) => {
      updateRow(change.rowId, changeToUpdate(change));
    },
    [updateRow],
  );

  const handleApplyAll = useCallback(
    (strategy: AllocationStrategy) => {
      for (const change of strategy.rowChanges) {
        updateRow(change.rowId, changeToUpdate(change));
      }
    },
    [updateRow],
  );

  const { wcCurrentlyPasses, rssCurrentlyPasses, wcBudget, nominalGapViolation } = result;

  useEffect(() => {
    onDetailOpenChange?.(openStrategyId !== null);
  }, [onDetailOpenChange, openStrategyId]);

  useEffect(() => {
    onNominalGapViolationChange?.(nominalGapViolation);
  }, [nominalGapViolation, onNominalGapViolationChange]);

  if (rows.length === 0) return null;

  // ── Status banner ─────────────────────────────────────────────────────────
  let bannerClass = 'gs-banner-pass';
  let bannerMsg = '✓ Design intent met';
  if (nominalGapViolation) {
    bannerClass = 'gs-banner-fail';
    bannerMsg = '✗ Nominal gap violates design intent — tolerances alone cannot fix this';
  } else if (!wcCurrentlyPasses) {
    bannerClass = 'gs-banner-fail';
    bannerMsg = '✗ WC fails design intent';
  } else if (!rssCurrentlyPasses) {
    bannerClass = 'gs-banner-warn';
    bannerMsg = '⚠ WC passes but RSS fails (statistically at risk)';
  }

  return (
    <div className="goalseek-panel">
      <h3>Tolerance Allocation</h3>

      {/* Status banner */}
      <div className={`gs-banner ${bannerClass}`}>{bannerMsg}</div>

      {/* Budget strip */}
      <div className="gs-budget-strip">
        <span className="gs-bud-item">
          <span className="gs-bud-label">WC</span>
          <span className="gs-bud-val">{fmt(result.currentWcTol)}</span>
        </span>
        {wcBudget !== null && (
          <span className="gs-bud-item">
            <span className="gs-bud-label">Budget</span>
            <span className={`gs-bud-val ${wcCurrentlyPasses ? 'gs-bud-ok' : 'gs-bud-over'}`}>
              {fmt(wcBudget)}
            </span>
          </span>
        )}
        <span className="gs-bud-item">
          <span className="gs-bud-label">RSS</span>
          <span className="gs-bud-val">{fmt(result.currentRssTol)}</span>
        </span>
        <span className="gs-bud-item">
          <span className="gs-bud-label">Gap</span>
          <span className="gs-bud-val">{result.nominalGap.toFixed(4)}</span>
        </span>
      </div>

      {/* Strategy cards */}
      {result.strategies.length > 0 ? (
        <div className="gs-strategies">
          {result.strategies.map((s) => (
            <StrategyCard
              key={s.id}
              strategy={s}
              open={openStrategyId === s.id}
              onToggle={() => setOpenStrategyId((current) => (current === s.id ? null : s.id))}
              onApplyRow={handleApplyRow}
              onApplyAll={handleApplyAll}
            />
          ))}
        </div>
      ) : wcCurrentlyPasses && rssCurrentlyPasses ? (
        <p className="gs-all-ok">
          All tolerances within design intent and at a reasonable IT grade.
        </p>
      ) : null}

      {/* Nominal gap violation advisory */}
      {nominalGapViolation && (
        <p className="gs-advisory">
          💡 Nominal gap ({result.nominalGap.toFixed(4)} mm) is on the wrong side of the limit.
          Revise nominal dimensions or design intent bounds.
        </p>
      )}
    </div>
  );
}
