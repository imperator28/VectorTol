import { useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useSettingsStore } from '../../store/settingsStore';
import { runGoalSeek } from '../../engine/standards';

export function GoalSeekPanel() {
  const rows = useProjectStore((s) => s.rows);
  const standards = useSettingsStore((s) => s.config.standards);

  // Map StackRow → the shape runGoalSeek expects
  const seekInput = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        component: r.component,
        dimId: r.dimId,
        source: r.toleranceSource,
        nominal: r.nominal,
        tolSymmetric: r.tolSymmetric,
        tolPlus: r.tolPlus,
        tolMinus: r.tolMinus,
      })),
    [rows],
  );

  const result = useMemo(() => runGoalSeek(seekInput, standards), [seekInput, standards]);

  if (rows.length === 0) return null;

  const hasAnySuggestion = result.rows.some((r) => r.suggestedTol !== null);

  return (
    <div className="goalseek-panel">
      <h3>Tolerance Allocation</h3>

      {/* Summary strip */}
      <div className="goalseek-summary">
        <span className="goalseek-label">WC total:</span>
        <span className="goalseek-value">±{result.currentWcTol.toFixed(4)}</span>
        {hasAnySuggestion && (
          <>
            <span className="goalseek-arrow">→</span>
            <span className="goalseek-value goalseek-new">±{result.newWcTol.toFixed(4)}</span>
            <span className="goalseek-pct">↓{result.reductionPct.toFixed(1)}%</span>
          </>
        )}
      </div>

      {/* Per-row table */}
      <table className="goalseek-table">
        <thead>
          <tr>
            <th>Component</th>
            <th title="Current centered tolerance">Now</th>
            <th title="Process capability suggestion">Suggest</th>
            <th title="% of WC total">%</th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((r) => (
            <tr
              key={r.id}
              className={r.suggestedTol !== null ? 'goalseek-row-improved' : ''}
            >
              <td className="goalseek-name" title={`${r.component} ${r.dimId}`}>
                {r.component || r.dimId || '—'}
              </td>
              <td className="goalseek-num">±{r.currentTol.toFixed(4)}</td>
              <td className="goalseek-num">
                {r.suggestedTol !== null ? (
                  <span className="goalseek-suggestion">±{r.suggestedTol.toFixed(4)}</span>
                ) : (
                  <span className="goalseek-ok">—</span>
                )}
              </td>
              <td className="goalseek-num goalseek-contrib">
                {r.currentContrib.toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!hasAnySuggestion && (
        <p className="goalseek-hint">
          All tolerances are at or within process capability limits.
        </p>
      )}
    </div>
  );
}
