import { useMemo, useState, useCallback, useEffect } from 'react';
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
import { Icon } from '../ui/Icon';

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
  open,
  onToggle,
  onApplyRow,
  onApplyAll,
}: {
  strategy: NominalStrategy;
  open: boolean;
  onToggle: () => void;
  onApplyRow: (change: NominalChange) => void;
  onApplyAll: (strategy: NominalStrategy) => void;
}) {
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
      <button className="na-strategy-header" onClick={onToggle}>
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

// ── lock chip ─────────────────────────────────────────────────────────────────

function DimLockChip({
  id,
  label,
  nominal,
  stars,
  locked,
  onToggle,
}: {
  id: string;
  label: string;
  nominal: number;
  stars: string;
  locked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className={`na-dim-chip ${locked ? 'na-dim-chip-locked' : ''}`}>
      <button
        className={`na-dim-lock-btn ${locked ? 'na-dim-lock-btn-on' : ''}`}
        onClick={() => onToggle(id)}
        title={locked ? 'Locked — click to unlock and allow adjustment' : 'Unlocked — click to lock this dimension (tooling/material constraint)'}
        aria-label={locked ? 'Unlock dimension' : 'Lock dimension'}
      >
        <Icon name={locked ? 'lock' : 'unlock'} size={11} />
      </button>
      <span className="na-dim-chip-label" title={label}>{label || '—'}</span>
      <span className="na-dim-chip-nom">{fmtDim(nominal, 3)}</span>
      <span className="na-dim-chip-stars" title="Adjustability">{stars}</span>
    </div>
  );
}

// ── main panel ────────────────────────────────────────────────────────────────

export function NominalAdvisorPanel({
  onDetailOpenChange,
}: {
  onDetailOpenChange?: (open: boolean) => void;
}) {
  const rows      = useProjectStore((s) => s.rows);
  const target    = useProjectStore((s) => s.target);
  const updateRow = useProjectStore((s) => s.updateRow);

  // Locked rows — user-toggled set of row IDs excluded from adjustment
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [openStrategyId, setOpenStrategyId] = useState<NominalStrategy['id'] | null>(null);

  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const advisorInput = useMemo(
    () =>
      rows.map((r) => {
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

  useEffect(() => {
    if (openStrategyId && !result.strategies.some((strategy) => strategy.id === openStrategyId)) {
      setOpenStrategyId(null);
    }
  }, [openStrategyId, result.strategies]);

  useEffect(() => {
    onDetailOpenChange?.(openStrategyId !== null);
  }, [onDetailOpenChange, openStrategyId]);

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

  const lockedCount = lockedIds.size;

  return (
    <div className="nominal-advisor-panel" data-tour="nominal-advisor">
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

      {/* Dimension lock list — always visible */}
      <div className="na-lock-section">
        <div className="na-lock-section-header">
          <span className="na-lock-section-title">
            <Icon name="lock" size={10} /> Dimension Locks
          </span>
          {lockedCount > 0 && (
            <span className="na-lock-count-badge">{lockedCount} locked</span>
          )}
          <span className="na-lock-section-hint">
            Lock dimensions that can't change (tooling / material)
          </span>
        </div>
        <div className="na-dim-chip-list">
          {result.rows.map((r) => (
            <DimLockChip
              key={r.id}
              id={r.id}
              label={r.component || r.dimId || '—'}
              nominal={r.nominal}
              stars={adjustabilityStars(r.adjustabilityScore)}
              locked={lockedIds.has(r.id)}
              onToggle={toggleLock}
            />
          ))}
        </div>
      </div>

      {/* Strategy cards */}
      {result.strategies.length > 0 ? (
        <div className="na-strategies">
          {result.strategies.map((s) => (
            <NominalStrategyCard
              key={s.id}
              strategy={s}
              open={openStrategyId === s.id}
              onToggle={() => setOpenStrategyId((current) => (current === s.id ? null : s.id))}
              onApplyRow={handleApplyRow}
              onApplyAll={handleApplyAll}
            />
          ))}
        </div>
      ) : wcCurrentlyPasses ? (
        <p className="na-all-ok">Nominal gap satisfies design intent. No changes needed.</p>
      ) : (
        <p className="na-advisory">
          💡 No adjustable dimensions found. Unlock more rows or add an assembly gap row.
        </p>
      )}
    </div>
  );
}
