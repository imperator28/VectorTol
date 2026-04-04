import { useProjectStore } from '../../store/projectStore';
import type { Decimal } from '../../engine/decimal';

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

  if (rows.length === 0) {
    return (
      <div className="results-footer">
        <p className="results-empty">Add dimensions to see analysis results.</p>
      </div>
    );
  }

  return (
    <div className="results-footer">
      <div className="results-section">
        <h4>Gap (Target)</h4>
        <span className="result-value">{fmt(results.gap)}</span>
      </div>

      <div className="results-section">
        <h4>Worst Case</h4>
        <table className="results-table">
          <tbody>
            <tr>
              <td>Tolerance:</td>
              <td className="result-value">{fmt(results.wcTolerance)}</td>
            </tr>
            <tr>
              <td>Min:</td>
              <td className="result-value">{fmt(results.wcMin)}</td>
            </tr>
            <tr>
              <td>Max:</td>
              <td className="result-value">{fmt(results.wcMax)}</td>
            </tr>
          </tbody>
        </table>
        <span className={`pass-badge ${results.wcPass ? 'pass' : 'fail'}`}>
          {results.wcPass ? 'PASS' : 'FAIL'}
        </span>
      </div>

      <div className="results-section">
        <h4>RSS</h4>
        <table className="results-table">
          <tbody>
            <tr>
              <td>Tolerance:</td>
              <td className="result-value">{fmt(results.rssTolerance)}</td>
            </tr>
            <tr>
              <td>Min:</td>
              <td className="result-value">{fmt(results.rssMin)}</td>
            </tr>
            <tr>
              <td>Max:</td>
              <td className="result-value">{fmt(results.rssMax)}</td>
            </tr>
          </tbody>
        </table>
        <span className={`pass-badge ${results.rssPass ? 'pass' : 'fail'}`}>
          {results.rssPass ? 'PASS' : 'FAIL'}
        </span>
      </div>

      <div className="results-section">
        <h4>RSS F/R</h4>
        <table className="results-table">
          <tbody>
            <tr>
              <td>Failure Rate:</td>
              <td className="result-value">{formatPct(results.rssFailureRate)}</td>
            </tr>
            <tr>
              <td>Yield:</td>
              <td className="result-value">{results.rssYieldPercent.toFixed(4)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
