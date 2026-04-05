import { useState, useCallback, useMemo, useRef, createContext, useContext } from 'react';
import { useProjectStore } from '../../store/projectStore';
import { useThemeStore } from '../../store/themeStore';
import { runMonteCarlo, type MonteCarloResult, type MonteCarloConfig } from '../../engine/monteCarlo';

function css(prop: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
}

// ── Shared state via context so card + plot stay in sync ────────────────────
interface McState {
  result: MonteCarloResult | null;
  running: boolean;
  elapsed: number;
  iterations: number;
  setIterations: (n: number) => void;
  handleRun: () => void;
}

const McContext = createContext<McState | null>(null);

/** Wrap ResultsFooter with this provider so both card and plot share state */
export function McProvider({ children }: { children: React.ReactNode }) {
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

  const ctx = useMemo(() => ({
    result, running, elapsed, iterations, setIterations, handleRun,
  }), [result, running, elapsed, iterations, handleRun]);

  return <McContext.Provider value={ctx}>{children}</McContext.Provider>;
}

function useMc() {
  const ctx = useContext(McContext);
  if (!ctx) throw new Error('McProvider missing');
  return ctx;
}

// ── SVG Layout (shared with DistributionPlot) ───────────────────────────────
const H = 200;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 38;

// Colors read from CSS custom properties at render time (theme-aware)

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

// ── Card mode: controls + summary stats ─────────────────────────────────────
function McCard() {
  const rows = useProjectStore((s) => s.rows);
  const { result, running, elapsed, iterations, setIterations, handleRun } = useMc();

  if (rows.length === 0) return null;

  return (
    <div className="result-card mc-card">
      <h4>Monte Carlo</h4>
      <div className="mc-controls">
        <select
          value={iterations}
          onChange={(e) => setIterations(Number(e.target.value))}
          className="mc-iter-select"
        >
          {ITERATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          className="mc-run-btn"
          onClick={handleRun}
          disabled={running || rows.length === 0}
        >
          {running ? '…' : '▶ Run'}
        </button>
        {elapsed > 0 && !running && (
          <span className="mc-elapsed">{elapsed}ms</span>
        )}
      </div>
      {result && (
        <table className="results-table">
          <tbody>
            <tr><td>Mean:</td><td className="result-value">{formatNum(result.mean)}</td></tr>
            <tr><td>Std Dev:</td><td className="result-value">{formatNum(result.stdDev)}</td></tr>
            <tr><td>F/R:</td><td className="result-value">{formatPct(result.failureRate)}</td></tr>
            <tr><td>Yield:</td><td className="result-value">{result.yieldPercent.toFixed(4)}%</td></tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Plot mode: histogram only ───────────────────────────────────────────────
function McPlot() {
  const target = useProjectStore((s) => s.target);
  const { result } = useMc();
  const themeMode = useThemeStore((s) => s.mode);

  const histogramSvg = useMemo(() => {
    if (!result || result.histogram.length === 0) return null;

    const HIST_FILL = css('--plot-pass-fill');
    const HIST_STROKE = css('--plot-pass-stroke');
    const FAIL_FILL = css('--plot-fail-fill');
    const FAIL_STROKE = css('--plot-fail-stroke');
    const BOUND_STROKE = css('--plot-boundary');
    const MEAN_STROKE = css('--plot-mean');
    const GRID_STROKE = css('--plot-grid');
    const AXIS_COLOR = css('--plot-axis');
    const TEXT_COLOR = css('--plot-text');
    const TEXT_TERTIARY = css('--text-tertiary');
    const YIELD_COLOR = css('--plot-yield');
    const FAIL_LABEL = css('--plot-fail-label');

    const bins = result.histogram;
    const xMin = bins[0]!.lo;
    const xMax = bins[bins.length - 1]!.hi;
    let yMax = 0;
    for (const b of bins) {
      if (b.density > yMax) yMax = b.density;
    }
    yMax *= 1.08;

    const PLOT_H = H - PAD_T - PAD_B;

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
      case 'flush':
      case 'custom':
        if (lo !== null) bounds.push({ value: lo, side: 'left' });
        if (hi !== null) bounds.push({ value: hi, side: 'right' });
        break;
    }

    const sigma = result.stdDev;
    const mean = result.mean;

    return (svgW: number) => {
      const PLOT_W = svgW - PAD_L - PAD_R;
      const sxl = (x: number) => PAD_L + ((x - xMin) / (xMax - xMin)) * PLOT_W;

      const ticks: { x: number; val: number; label: string; bold?: boolean }[] = [];
      for (let s = -3; s <= 3; s++) {
        const val = mean + s * sigma;
        if (val >= xMin && val <= xMax) {
          ticks.push({ x: sxl(val), val, label: formatNum(val), bold: s === 0 });
        }
      }
      const sigmaLabels = ticks.map((t) => {
        const sIdx = Math.round((t.val - mean) / (sigma || 1));
        return { x: t.x, label: sIdx === 0 ? 'μ' : `${sIdx > 0 ? '+' : ''}${sIdx}σ` };
      });

      return (
        <svg width="100%" height={H} viewBox={`0 0 ${svgW} ${H}`} preserveAspectRatio="xMidYMid meet">
          {ticks.map((t, i) => (
            <line key={`g${i}`} x1={t.x} y1={PAD_T} x2={t.x} y2={PAD_T + PLOT_H}
              stroke={GRID_STROKE} strokeWidth={0.5} />
          ))}
          {bins.map((bin, i) => {
            const binMid = (bin.lo + bin.hi) / 2;
            const isFail = bounds.some((b) => b.side === 'left' ? binMid < b.value : binMid > b.value);
            return (
              <rect key={`bar${i}`}
                x={sxl(bin.lo)} y={sy(bin.density)}
                width={Math.max(1, sxl(bin.hi) - sxl(bin.lo) - 0.5)}
                height={Math.max(0, sy(0) - sy(bin.density))}
                fill={isFail ? FAIL_FILL : HIST_FILL}
                stroke={isFail ? FAIL_STROKE : HIST_STROKE} strokeWidth={0.5} />
            );
          })}
          {mean >= xMin && mean <= xMax && (
            <line x1={sxl(mean)} y1={PAD_T} x2={sxl(mean)} y2={PAD_T + PLOT_H}
              stroke={MEAN_STROKE} strokeWidth={1} strokeDasharray="4 3" />
          )}
          {bounds.map((b, i) => {
            if (b.value < xMin || b.value > xMax) return null;
            return (
              <g key={`bound${i}`}>
                <line x1={sxl(b.value)} y1={PAD_T} x2={sxl(b.value)} y2={PAD_T + PLOT_H}
                  stroke={BOUND_STROKE} strokeWidth={1.5} strokeDasharray="6 3" />
                <text x={sxl(b.value)} y={PAD_T - 4} textAnchor="middle"
                  fill={BOUND_STROKE} fontSize={9} fontWeight={600}>{formatNum(b.value)}</text>
              </g>
            );
          })}
          <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H}
            stroke={AXIS_COLOR} strokeWidth={1} />
          {ticks.map((t, i) => (
            <g key={`tick${i}`}>
              <line x1={t.x} y1={PAD_T + PLOT_H} x2={t.x} y2={PAD_T + PLOT_H + 4} stroke={AXIS_COLOR} strokeWidth={1} />
              <text x={t.x} y={PAD_T + PLOT_H + 14} textAnchor="middle" fill={AXIS_COLOR} fontSize={8}
                fontWeight={t.bold ? 700 : 400}>{t.label}</text>
            </g>
          ))}
          {sigmaLabels.map((sl, i) => (
            <text key={`sl${i}`} x={sl.x} y={PAD_T + PLOT_H + 24} textAnchor="middle" fill={TEXT_COLOR}
              fontSize={8} fontStyle={sl.label === 'μ' ? 'normal' : 'italic'}
              fontWeight={sl.label === 'μ' ? 700 : 400}>{sl.label}</text>
          ))}
          <text x={10} y={PAD_T + PLOT_H / 2} textAnchor="middle" fill={TEXT_TERTIARY} fontSize={9}
            transform={`rotate(-90 10 ${PAD_T + PLOT_H / 2})`}>Frequency Density</text>
          <rect x={PAD_L + 4} y={PAD_T + 2} width={8} height={8} rx={1}
            fill={HIST_FILL} stroke={HIST_STROKE} strokeWidth={0.5} />
          <text x={PAD_L + 15} y={PAD_T + 9} fill={YIELD_COLOR} fontSize={9} fontWeight={600}>
            Yield: {result.yieldPercent.toFixed(4)}%
          </text>
          <rect x={PAD_L + 4} y={PAD_T + 14} width={8} height={8} rx={1}
            fill={FAIL_FILL} stroke={FAIL_STROKE} strokeWidth={0.5} />
          <text x={PAD_L + 15} y={PAD_T + 21} fill={FAIL_LABEL} fontSize={9} fontWeight={600}>
            F/R: {formatPct(result.failureRate)} ({result.failureCount.toLocaleString()})
          </text>
        </svg>
      );
    };
  }, [result, target, themeMode]);

  if (!histogramSvg) {
    return (
      <div className="mc-plot-empty">
        <span>Run Monte Carlo to see histogram</span>
      </div>
    );
  }

  // Render at a standard width — the viewBox + 100% width will scale
  return <div className="mc-plot-wrap">{histogramSvg(460)}</div>;
}

// ── Public component with mode switch ───────────────────────────────────────
export function MonteCarloPanel({ mode }: { mode: 'card' | 'plot' }) {
  return mode === 'card' ? <McCard /> : <McPlot />;
}
