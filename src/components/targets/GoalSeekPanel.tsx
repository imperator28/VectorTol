import { useMemo, useState } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import { runSmartAllocation } from '../../engine/standards';
import type { AllocationStrategy, SmartAllocationResult } from '../../engine/standards';

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

// ── strategy card ─────────────────────────────────────────────────────────────

function StrategyCard({
  strategy,
}: {
  strategy: AllocationStrategy;
}) {
  const [open, setOpen] = useState(false);

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
        strategy.feasible ? 'gs-strategy-feasible' : 'gs-strategy-infeasible',
        strategy.recommended ? 'gs-strategy-recommended' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Header row */}
      <button className="gs-strategy-header" onClick={() => setOpen((o) => !o)}>
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
            <span className="gs-strategy-wc">
              WC: {fmt(strategy.newWcTol)}
            </span>
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
            <table className="gs-change-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>From</th>
                  <th>To</th>
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
                      {/* If this is an asymmetric shift the tolerance doesn't change */}
                      {Math.abs(c.nominalShift) > 0.0001 ? (
                        <span title={c.note}>{c.note}</span>
                      ) : (
                        <>
                          {fmt(c.toTol)}
                          {c.toITGrade && (
                            <span className="gs-grade">{c.toITGrade}</span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="gs-no-changes">No rows require adjustment.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function GoalSeekPanel() {
  const rows    = useProjectStore((s) => s.rows);
  const target  = useProjectStore((s) => s.target);
  const standards = useSettingsStore((s) => s.config.standards);

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

  if (rows.length === 0) return null;

  const { wcCurrentlyPasses, rssCurrentlyPasses, wcBudget, nominalGapViolation } = result;

  // ── Status banner ─────────────────────────────────────────────────────────
  let bannerClass = 'gs-banner-pass';
  let bannerMsg = '✓ Design intent met';
  if (nominalGapViolation) {
    bannerClass = 'gs-banner-fail';
    bannerMsg = '✗ Nominal gap violates design intent — tolerance allocation alone cannot fix this';
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
            <span
              className={`gs-bud-val ${wcCurrentlyPasses ? 'gs-bud-ok' : 'gs-bud-over'}`}
            >
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
            <StrategyCard key={s.id} strategy={s} />
          ))}
        </div>
      ) : wcCurrentlyPasses && rssCurrentlyPasses ? (
        <p className="gs-all-ok">
          All tolerances are within design intent and at a reasonable IT grade.
          No adjustments needed.
        </p>
      ) : null}

      {/* Nominal gap violation advisory */}
      {nominalGapViolation && (
        <p className="gs-advisory">
          💡 The nominal gap ({result.nominalGap.toFixed(4)} mm) is already on the wrong side of
          the design limit. Revise nominal dimensions or the design intent bounds.
        </p>
      )}
    </div>
  );
}
