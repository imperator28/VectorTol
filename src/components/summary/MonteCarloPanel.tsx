import { useState, useCallback, useMemo, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { runMonteCarlo, type MonteCarloResult, type MonteCarloConfig } from '../../engine/monteCarlo';

// ── SVG Layout ──────────────────────────────────────────────────────────────
const W = 460;
const H = 220;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 44;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

const HIST_FILL = 'rgba(0, 122, 255, 0.25)';
const HIST_STROKE = 'rgba(0, 122, 255, 0.6)';
const FAIL_FILL = 'rgba(255, 59, 48, 0.35)';
const BOUND_STROKE = '#FF9500';
const MEAN_STROKE = '#007AFF';
const GRID_STROKE = '#e0e0e0';

function formatNum(v: number, dp = 4): string {
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2);
  return v.toFixed(dp);
}

function formatPct(rate: number): string {
  if (rate === 0) return '0 ppm';
  if (rate < 0.000001) return `${(rate * 1e6).toFixed(2)} ppm`;
  if (rate < 0.01) return `${(rate * 100).toFixed(4)}%`;
  return `${(rate * 100).toFixed(2)}%`;
}

const ITERATION_OPTIONS = [
  { value: 10_000, label: '10K' },
  { value: 50_000, label: '50K' },
  { value: 100_000, label: '100K' },
  { value: 500_000, label: '500K' },
  { value: 1_000_000, label: '1M' },
];

export function MonteCarloPanel() {
  const rows = useProjectStore((s) => s.rows);
  const target = useProjectStore((s) => s.target);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [iterations, setIterations] = useState(100_000);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const runIdRef = useRef(0);

  const handleRun = useCallback(() => {
    if (rows.length === 0) return;
    setRunning(true);
    const runId = ++runIdRef.current;
    const start = performance.now();
    const config: MonteCarloConfig = { iterations };

    // Use setTimeout to unblock the UI before heavy computation
    setTimeout(() => {
      const res = runMonteCarlo(rows, target, config);
      const ms = performance.now() - start;
      if (runId === runIdRef.current) {
        setResult(res);
        setElapsed(Math.round(ms));
        setRunning(false);
      }
    }, 16);
  }, [rows, target, iterations]);

  // ── Histogram SVG ───────────────────────────────────────────────────────
  const histogramSvg = useMemo(() => {
    if (!result || result.histogram.length === 0) return null;

    const bins = result.histogram;
    const xMin = bins[0]!.lo;
    const xMax = bins[bins.length - 1]!.hi;
    let yMax = 0;
    for (const b of bins) {
      if (b.density > yMax) yMax = b.density;
    }
    yMax *= 1.08;

    const sx = (x: number) => PAD_L + ((x - xMin) / (xMax - xMin)) * PLOT_W;
    const sy = (y: number) => PAD_T + PLOT_H - (y / yMax) * PLOT_H;

    // Boundary lines
    const lo = target.minGap !== null ? parseFloat(target.minGap) : null;
    const hi = target.maxGap !== null ? parseFloat(target.maxGap) : null;
    const bounds: { value: number; side: 'left' | 'right' }[] = [];

    switch (target.type) {
      case 'clearance':
        if (lo !== null) bounds.push({ value: lo, side: 'left' });
        break;
      case 'interference':
        if (lo !== null) bounds.push({ value: lo, side: 'right' });
        if (hi !== null) bounds.push({ value: hi, side: 'left' });
        break;
      case 'proud':
        bounds.push({ value: lo ?? 0, side: 'left' });
        break;
      case 'recess':
        bounds.push({ value: hi ?? 0, side: 'right' });
        break;
    }

    // X-axis ticks: mean, ±1σ, ±2σ, ±3σ
    const sigma = result.stdDev;
    const mean = result.mean;
    const ticks: { x: number; val: number; label: string; bold?: boolean }[] = [];
    for (let s = -3; s <= 3; s++) {
      const val = mean + s * sigma;
      if (val >= xMin && val <= xMax) {
        ticks.push({
          x: sx(val),
          val,
          label: formatNum(val),
          bold: s === 0,
        });
      }
    }

    const sigmaLabels = ticks.map((t) => {
      const sIdx = Math.round((t.val - mean) / (sigma || 1));
      return {
        x: t.x,
        label: sIdx === 0 ? 'μ' : `${sIdx > 0 ? '+' : ''}${sIdx}σ`,
      };
    });

    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid lines */}
        {ticks.map((t, i) => (
          <line key={`g${i}`} x1={t.x} y1={PAD_T} x2={t.x} y2={PAD_T + PLOT_H}
            stroke={GRID_STROKE} strokeWidth={0.5} />
        ))}

        {/* Histogram bars */}
        {bins.map((bin, i) => {
          // Check if this bin is in a failure region
          const binMid = (bin.lo + bin.hi) / 2;
          const isFail = bounds.some((b) =>
            b.side === 'left' ? binMid < b.value : binMid > b.value
          );
          return (
            <rect
              key={`bar${i}`}
              x={sx(bin.lo)}
              y={sy(bin.density)}
              width={Math.max(1, sx(bin.hi) - sx(bin.lo) - 0.5)}
              height={Math.max(0, sy(0) - sy(bin.density))}
              fill={isFail ? FAIL_FILL : HIST_FILL}
              stroke={isFail ? 'rgba(255,59,48,0.5)' : HIST_STROKE}
              strokeWidth={0.5}
            />
          );
        })}

        {/* Mean line */}
        {mean >= xMin && mean <= xMax && (
          <line x1={sx(mean)} y1={PAD_T} x2={sx(mean)} y2={PAD_T + PLOT_H}
            stroke={MEAN_STROKE} strokeWidth={1} strokeDasharray="4 3" />
        )}

        {/* Boundary lines */}
        {bounds.map((b, i) => {
          const bx = b.value;
          if (bx < xMin || bx > xMax) return null;
          return (
            <g key={`bound${i}`}>
              <line x1={sx(bx)} y1={PAD_T} x2={sx(bx)} y2={PAD_T + PLOT_H}
                stroke={BOUND_STROKE} strokeWidth={1.5} strokeDasharray="6 3" />
              <text x={sx(bx)} y={PAD_T - 4} textAnchor="middle"
                fill={BOUND_STROKE} fontSize={9} fontWeight={600}>
                {formatNum(bx)}
              </text>
            </g>
          );
        })}

        {/* X-axis */}
        <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H}
          stroke="#333" strokeWidth={1} />

        {/* Ticks */}
        {ticks.map((t, i) => (
          <g key={`tick${i}`}>
            <line x1={t.x} y1={PAD_T + PLOT_H} x2={t.x} y2={PAD_T + PLOT_H + 4}
              stroke="#333" strokeWidth={1} />
            <text x={t.x} y={PAD_T + PLOT_H + 14} textAnchor="middle"
              fill="#333" fontSize={8} fontWeight={t.bold ? 700 : 400}>
              {t.label}
            </text>
          </g>
        ))}

        {/* σ labels */}
        {sigmaLabels.map((sl, i) => (
          <text key={`sl${i}`} x={sl.x} y={PAD_T + PLOT_H + 24}
            textAnchor="middle" fill="#666" fontSize={8}
            fontStyle={sl.label === 'μ' ? 'normal' : 'italic'}
            fontWeight={sl.label === 'μ' ? 700 : 400}>
            {sl.label}
          </text>
        ))}

        {/* Y-axis label */}
        <text x={10} y={PAD_T + PLOT_H / 2} textAnchor="middle" fill="#999" fontSize={9}
          transform={`rotate(-90 10 ${PAD_T + PLOT_H / 2})`}>
          Frequency Density
        </text>

        {/* Legend */}
        <rect x={PAD_L + 4} y={PAD_T + 2} width={8} height={8} rx={1}
          fill={HIST_FILL} stroke={HIST_STROKE} strokeWidth={0.5} />
        <text x={PAD_L + 15} y={PAD_T + 9} fill="#007AFF" fontSize={9} fontWeight={600}>
          Yield: {result.yieldPercent.toFixed(4)}%
        </text>

        <rect x={PAD_L + 4} y={PAD_T + 14} width={8} height={8} rx={1}
          fill={FAIL_FILL} stroke="rgba(255,59,48,0.5)" strokeWidth={0.5} />
        <text x={PAD_L + 15} y={PAD_T + 21} fill="#c0392b" fontSize={9} fontWeight={600}>
          F/R: {formatPct(result.failureRate)} ({result.failureCount.toLocaleString()} / {result.iterations.toLocaleString()})
        </text>
      </svg>
    );
  }, [result, target]);

  if (rows.length === 0) return null;

  return (
    <div className="mc-panel">
      <h4 className="mc-title">Monte Carlo Simulation</h4>

      <div className="mc-controls">
        <label className="mc-iter-label">
          Iterations:
          <select
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className="mc-iter-select"
          >
            {ITERATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
        <button
          className="mc-run-btn"
          onClick={handleRun}
          disabled={running || rows.length === 0}
        >
          {running ? 'Running…' : '▶ Run'}
        </button>
        {elapsed > 0 && !running && (
          <span className="mc-elapsed">{elapsed} ms</span>
        )}
      </div>

      {result && (
        <>
          <div className="mc-stats">
            <table className="mc-stats-table">
              <tbody>
                <tr>
                  <td>Mean:</td>
                  <td className="result-value">{formatNum(result.mean)}</td>
                  <td>Std Dev:</td>
                  <td className="result-value">{formatNum(result.stdDev)}</td>
                </tr>
                <tr>
                  <td>Min:</td>
                  <td className="result-value">{formatNum(result.min)}</td>
                  <td>Max:</td>
                  <td className="result-value">{formatNum(result.max)}</td>
                </tr>
                <tr>
                  <td>P0.1%:</td>
                  <td className="result-value">{formatNum(result.p001)}</td>
                  <td>P99.9%:</td>
                  <td className="result-value">{formatNum(result.p999)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {histogramSvg}
        </>
      )}
    </div>
  );
}
