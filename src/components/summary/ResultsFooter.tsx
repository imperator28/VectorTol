import { useProjectStore } from '../../store/projectStore';
import type { Decimal } from '../../engine/decimal';
import { DistributionPlot } from './DistributionPlot';
import { MonteCarloPanel, McProvider } from './MonteCarloPanel';

function fmt(val: Decimal, dp: number = 4): string {
  return val.toDecimalPlaces(dp).toString();
}

function formatPct(rate: number): string {
  if (rate === 0) return '0 ppm';
  if (rate < 0.000001) return `${(rate * 1e6).toFixed(2)} ppm`;
  if (rate < 0.01) return `${(rate * 100).toFixed(4)}%`;
  return `${(rate * 100).toFixed(2)}%`;
}

export function ResultsFooter() {
  const results = useProjectStore((s) => s.results);
  const rows = useProjectStore((s) => s.rows);
  const target = useProjectStore((s) => s.target);

  if (rows.length === 0) {
    return (
      <div className="results-footer">
        <p className="results-empty">Add stack-up rows to see results.</p>
      </div>
    );
  }

  // Build target range subtitle
  const lo = target.minGap;
  const hi = target.maxGap;
  let targetRange = '';
  if (lo !== null && hi !== null) {
    targetRange = `${lo} to ${hi}`;
  } else if (lo !== null) {
    targetRange = `min ${lo}`;
  } else if (hi !== null) {
    targetRange = `max ${hi}`;
  }

  return (
    <McProvider>
    <div className="results-footer">
      {/* Cards row — CSS grid for consistent sizing */}
      <div className="results-cards">
        {/* Gap card — with target context */}
        <div className="result-card">
          <h4>Gap</h4>
          <span className="result-value result-value-lg">{fmt(results.gap)}</span>
          {targetRange && (
            <span className="result-subtitle">
              {target.type}: {targetRange}
            </span>
          )}
        </div>

        {/* Worst Case — verdict-first layout */}
        <div className="result-card">
          <div className="result-card-header">
            <h4>Worst Case</h4>
            <span className={`pass-badge ${results.wcPass ? 'pass' : 'fail'}`}>
              {results.wcPass ? 'PASS' : 'FAIL'}
            </span>
          </div>
          <table className="results-table">
            <tbody>
              <tr><td>Tol</td><td className="result-value">{fmt(results.wcTolerance)}</td></tr>
              <tr><td>Min</td><td className="result-value">{fmt(results.wcMin)}</td></tr>
              <tr><td>Max</td><td className="result-value">{fmt(results.wcMax)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* RSS — verdict-first layout */}
        <div className="result-card">
          <div className="result-card-header">
            <h4>RSS</h4>
            <span className={`pass-badge ${results.rssPass ? 'pass' : 'fail'}`}>
              {results.rssPass ? 'PASS' : 'FAIL'}
            </span>
          </div>
          <table className="results-table">
            <tbody>
              <tr><td>Tol</td><td className="result-value">{fmt(results.rssTolerance)}</td></tr>
              <tr><td>Min</td><td className="result-value">{fmt(results.rssMin)}</td></tr>
              <tr><td>Max</td><td className="result-value">{fmt(results.rssMax)}</td></tr>
            </tbody>
          </table>
        </div>

        {/* RSS Yield — yield as primary value */}
        <div className="result-card">
          <h4>RSS Yield</h4>
          <span className="result-value result-value-lg result-yield">{results.rssYieldPercent.toFixed(2)}%</span>
          <table className="results-table">
            <tbody>
              <tr><td>F/R</td><td className="result-value">{formatPct(results.rssFailureRate)}</td></tr>
            </tbody>
          </table>
        </div>

        <MonteCarloPanel mode="card" />
      </div>

      {/* Plots row — side by side, aligned */}
      <div className="results-plots-row">
        <div className="results-plot-col">
          <DistributionPlot />
        </div>
        <div className="results-plot-col">
          <MonteCarloPanel mode="plot" />
        </div>
      </div>
    </div>
    </McProvider>
  );
}
