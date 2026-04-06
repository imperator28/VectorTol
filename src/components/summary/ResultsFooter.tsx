import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useProjectStore } from '../../store/projectStore';
import type { Decimal } from '../../engine/decimal';
import { DistributionPlot } from './DistributionPlot';
import { MonteCarloPanel, McProvider } from './MonteCarloPanel';
import { Icon } from '../ui/Icon';

function fmt(val: Decimal, dp: number = 4): string {
  return val.toDecimalPlaces(dp).toString();
}

function formatPct(rate: number): string {
  if (rate === 0) return '0 ppm';
  if (rate < 0.000001) return `${(rate * 1e6).toFixed(2)} ppm`;
  if (rate < 0.01) return `${(rate * 100).toFixed(4)}%`;
  return `${(rate * 100).toFixed(2)}%`;
}

function PlotModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return createPortal(
    <div className="plot-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="plot-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="plot-modal-header">
          <span className="plot-modal-title">{title}</span>
          <button className="plot-modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="plot-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ResultsFooter() {
  const results = useProjectStore((s) => s.results);
  const rows = useProjectStore((s) => s.rows);
  const target = useProjectStore((s) => s.target);
  const [expandedPlot, setExpandedPlot] = useState<'dist' | 'mc' | null>(null);

  if (rows.length === 0) {
    return (
      <div className="results-footer">
        <p className="results-empty">Add stack-up rows to see results.</p>
      </div>
    );
  }

  const lo = target.minGap;
  const hi = target.maxGap;
  let targetRange = '';
  if (lo !== null && hi !== null) targetRange = `${lo} to ${hi}`;
  else if (lo !== null) targetRange = `min ${lo}`;
  else if (hi !== null) targetRange = `max ${hi}`;

  return (
    <McProvider>
      <div className="results-footer">
        {/* Analysis cards */}
        <div className="results-cards">
          <div className="result-card">
            <h4>Gap</h4>
            <span className="result-value result-value-lg">{fmt(results.gap)}</span>
            {targetRange && (
              <span className="result-subtitle">{target.type}: {targetRange}</span>
            )}
          </div>

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

          <div className="result-card">
            <h4>RSS Yield</h4>
            <span className="result-value result-value-lg result-yield">
              {results.rssYieldPercent.toFixed(2)}%
            </span>
            <table className="results-table">
              <tbody>
                <tr><td>F/R</td><td className="result-value">{formatPct(results.rssFailureRate)}</td></tr>
              </tbody>
            </table>
          </div>

          <MonteCarloPanel mode="card" />
        </div>

        {/* Plot preview cards — mini sparklines with expand */}
        <div className="results-plot-cards">
          {/* RSS Distribution mini card */}
          <div
            className="result-card result-card-plot result-card-clickable"
            onClick={() => setExpandedPlot('dist')}
            title="Click to expand RSS distribution"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setExpandedPlot('dist')}
          >
            <div className="result-card-header">
              <h4>RSS Distribution</h4>
              <span className="plot-expand-hint">click to expand</span>
              <button
                className="plot-expand-btn"
                onClick={(e) => { e.stopPropagation(); setExpandedPlot('dist'); }}
                title="Expand"
                aria-label="Expand RSS distribution plot"
              >
                <Icon name="maximize" size={10} />
              </button>
            </div>
            <div className="result-card-mini-plot">
              <DistributionPlot mini />
            </div>
          </div>

          {/* Monte Carlo mini card */}
          <div
            className="result-card result-card-plot result-card-clickable"
            onClick={() => setExpandedPlot('mc')}
            title="Click to expand Monte Carlo simulation"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && setExpandedPlot('mc')}
          >
            <div className="result-card-header">
              <h4>Monte Carlo</h4>
              <span className="plot-expand-hint">click to expand</span>
              <button
                className="plot-expand-btn"
                onClick={(e) => { e.stopPropagation(); setExpandedPlot('mc'); }}
                title="Expand"
                aria-label="Expand Monte Carlo plot"
              >
                <Icon name="maximize" size={10} />
              </button>
            </div>
            <div className="result-card-mini-plot">
              <MonteCarloPanel mode="mini" />
            </div>
          </div>
        </div>

        {/* Expand modals */}
        {expandedPlot === 'dist' && (
          <PlotModal title="RSS Distribution" onClose={() => setExpandedPlot(null)}>
            <DistributionPlot />
          </PlotModal>
        )}
        {expandedPlot === 'mc' && (
          <PlotModal title="Monte Carlo Simulation" onClose={() => setExpandedPlot(null)}>
            <McProvider>
              <MonteCarloPanel mode="full" />
            </McProvider>
          </PlotModal>
        )}
      </div>
    </McProvider>
  );
}
