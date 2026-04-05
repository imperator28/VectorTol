import { useMemo, useState, useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import {
  runNominalAdvisor,
  adjustabilityStars,
} from '../../engine/standards';
import type {
  NominalStrategy,
  NominalChange,
  NominalAdvisorResult,
} from '../../engine/standards';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDim(n: number, dp = 4): string {
  return n.toFixed(dp);
}

function fmtDelta(n: number, dp = 4): string {
  return (n >= 0 ? '+' : '') + n.toFixed(dp);
}

function PassBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span className={`na-badge ${pass ? 'na-badge-pass' : 'na-badge-fail'}`}>
      {pass ? '✓' : '✗'} {label}
    </span>
  );
}

// ── strategy card ─────────────────────────────────────────────────────────────

const STRATEGY_ICONS: Record<NominalStrategy['id'], string> = {
  'closing-link': '🔗',
  'equal-split': '⚖',
  'weighted-adjustability': '★',
};

function NominalStrategyCard({
  strategy,
  onApplyRow,
  onApplyAll,
}: {
  strategy: NominalStrategy;
  onApplyRow: (change: NominalChange) => void;
  onApplyAll: (strategy: NominalStrategy) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={[
        'na-strategy',
        strategy.feasible ? 'na-strategy-feasible' : 'na-strategy-infeasible',
        strategy.recommended ? 'na-strategy-recommended' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Header */}
      <button className="na-strategy-header" onClick={() => setOpen((o) => !o)}>
        <span className="na-strategy-icon">{STRATEGY_ICONS[strategy.id]}</span>
        <span className="na-strategy-label">
          {strategy.label}
          {strategy.recommended && (
            <span className="na-recommended-badge">Recommended</span>
          )}
        </span>
        <span className="na-strategy-arrow">{open ? '▴' : '▾'}</span>
      </button>

      {/* Quick summary */}
      <div className="na-strategy-summary">
        {strategy.feasible ? (
          <>
            <span className="na-strategy-gap">
              Gap → {fmtDim(strategy.newNominalGap)}
            </span>
            <PassBadge pass={strategy.wcPassAfter} label="WC" />
            <PassBadge pass={strategy.rssPassAfter} label="RSS" />
          </>
        ) : (
          <span className="na-infeasible-note">
            ⚠ {strategy.infeasibleReason ?? 'Not feasible'}
          </span>
        )}
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="na-strategy-detail">
          <p className="na-strategy-desc">{strategy.description}</p>

          {strategy.changes.length > 0 ? (
            <>
              <table className="na-change-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>From</th>
                    <th>Δ</th>
                    <th>To</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {strategy.changes.map((c) => (
                    <tr key={c.rowId}>
                      <td
                        className="na-part-name"
                        title={`${c.component} ${c.dimId}`}
                      >
                        {c.component || c.dimId || '—'}
                      </td>
                      <td className="na-num">{fmtDim(c.fromNominal)}</td>
                      <td
                        className={`na-num na-delta ${c.delta >= 0 ? 'na-delta-pos' : 'na-delta-neg'}`}
                        title={c.note}
                      >
                        {fmtDelta(c.delta)}
                        <span className="na-pct">
                          ({c.deltaPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="na-num na-to-nom">{fmtDim(c.toNominal)}</td>
                      <td className="na-apply-cell">
                        <button
                          className="na-apply-btn"
                          onClick={() => onApplyRow(c)}
                          title="Apply this nominal change to the row"
                        >
                          Apply
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="na-apply-all-row">
                <button
                  className="na-apply-all-btn"
                  onClick={() => onApplyAll(strategy)}
                  title="Apply all nominal changes in this strategy"
                >
                  ✓ Apply All ({strategy.changes.length})
                </button>
              </div>
            </>
          ) : (
            <p className="na-no-changes">No changes needed.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function NominalAdvisorPanel() {
  const rows      = useProjectStore((s) => s.rows);
  const target    = useProjectStore((s) => s.target);
  const updateRow = useProjectStore((s) => s.updateRow);

  // Locked rows — user-toggled set of row IDs that should not be adjusted
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const [showAdjTable, setShowAdjTable] = useState(false);

  const advisorInput = useMemo(
    () =>
      rows.map((r) => {
        // Resolve effective half-tolerance (same logic as engine)
        let centeredTol = 0;
        const sym = r.tolSymmetric !== null ? parseFloat(r.tolSymmetric) : NaN;
        const plus  = r.tolPlus   !== null ? parseFloat(r.tolPlus)   : NaN;
        const minus = r.tolMinus  !== null ? parseFloat(r.tolMinus)  : NaN;
        if (!isNaN(sym)) {
          centeredTol = Math.abs(sym);
        } else if (!isNaN(plus) && !isNaN(minus)) {
          centeredTol = (Math.abs(plus) + Math.abs(minus)) / 2;
        }
        return {
          id: r.id,
          component: r.component,
          dimId: r.dimId,
          source: r.toleranceSource,
          direction: r.direction,
          nominal: parseFloat(r.nominal) || 0,
          centeredTol,
        };
      }),
    [rows],
  );

  const result: NominalAdvisorResult = useMemo(
    () => runNominalAdvisor(advisorInput, target, lockedIds),
    [advisorInput, target, lockedIds],
  );

  const handleApplyRow = useCallback(
    (change: NominalChange) => {
      updateRow(change.rowId, { nominal: String(change.toNominal) });
    },
    [updateRow],
  );

  const handleApplyAll = useCallback(
    (strategy: NominalStrategy) => {
      for (const change of strategy.changes) {
        updateRow(change.rowId, { nominal: String(change.toNominal) });
      }
    },
    [updateRow],
  );

  if (rows.length === 0) return null;

  const { wcCurrentlyPasses, neededGapShift, nominalGap, currentWcTol } = result;

  // ── Status banner ─────────────────────────────────────────────────────────
  let bannerClass = 'na-banner-pass';
  let bannerMsg   = '✓ Nominal gap satisfies design intent';
  if (!wcCurrentlyPasses) {
    bannerClass = 'na-banner-fail';
    bannerMsg   = `✗ Nominal gap off by ${fmtDelta(neededGapShift)} mm`;
  }

  return (
    <div className="nominal-advisor-panel">
      <h3>Nominal Advisor</h3>

      {/* Status banner */}
      <div className={`na-banner ${bannerClass}`}>{bannerMsg}</div>

      {/* Budget strip */}
      <div className="na-budget-strip">
        <span className="na-bud-item">
          <span className="na-bud-label">Gap</span>
          <span className="na-bud-val">{fmtDim(nominalGap)}</span>
        </span>
        <span className="na-bud-item">
          <span className="na-bud-label">WC±</span>
          <span className="na-bud-val">{fmtDim(currentWcTol)}</span>
        </span>
        <span className="na-bud-item">
          <span className="na-bud-label">Shift needed</span>
          <span className={`na-bud-val ${Math.abs(neededGapShift) < 1e-9 ? 'na-bud-ok' : 'na-bud-over'}`}>
            {Math.abs(neededGapShift) < 1e-9 ? '—' : fmtDelta(neededGapShift)}
          </span>
        </span>
      </div>

      {/* Adjustability table (collapsible) */}
      <button
        className="na-toggle-adj"
        onClick={() => setShowAdjTable((v) => !v)}
      >
        {showAdjTable ? '▴' : '▾'} Part adjustability
      </button>
      {showAdjTable && (
        <table className="na-adj-table">
          <thead>
            <tr>
              <th>Part</th>
              <th>Nom</th>
              <th title="Manufacturing adjustability: ★★★ = easy, ☆☆☆ = locked">Adj</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr
                key={r.id}
                className={lockedIds.has(r.id) ? 'na-row-locked' : ''}
                title={
                  lockedIds.has(r.id)
                    ? 'Locked — excluded from suggestions'
                    : r.adjustabilityNote
                }
              >
                <td className="na-adj-name">
                  <button
                    className={`na-lock-btn ${lockedIds.has(r.id) ? 'na-lock-btn-on' : ''}`}
                    onClick={() => toggleLock(r.id)}
                    title={lockedIds.has(r.id) ? 'Unlock' : 'Lock (exclude from suggestions)'}
                  >
                    {lockedIds.has(r.id) ? '🔒' : '🔓'}
                  </button>
                  {r.component || r.dimId || '—'}
                </td>
                <td className="na-adj-nom">{fmtDim(r.nominal)}</td>
                <td className="na-adj-stars">{adjustabilityStars(r.adjustabilityScore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Strategy cards */}
      {result.strategies.length > 0 ? (
        <div className="na-strategies">
          {result.strategies.map((s) => (
            <NominalStrategyCard
              key={s.id}
              strategy={s}
              onApplyRow={handleApplyRow}
              onApplyAll={handleApplyAll}
            />
          ))}
        </div>
      ) : wcCurrentlyPasses ? (
        <p className="na-all-ok">Nominal gap satisfies design intent. No changes needed.</p>
      ) : (
        <p className="na-advisory">
          💡 No adjustable dimensions found. Lock fewer rows or add an assembly gap row.
        </p>
      )}
    </div>
  );
}
