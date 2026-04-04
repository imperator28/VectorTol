import { useMemo } from 'react';
import { useProjectStore } from '../../store/projectStore';

// ── Normal PDF ──────────────────────────────────────────────────────────────
const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return (INV_SQRT_2PI / sigma) * Math.exp(-0.5 * z * z);
}

// ── SVG Layout Constants ────────────────────────────────────────────────────
const W = 460;
const H = 200;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 18;
const PAD_B = 38;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const NUM_POINTS = 200;

// Colors
const PASS_FILL = 'rgba(52, 199, 89, 0.35)';   // green
const FAIL_FILL = 'rgba(255, 59, 48, 0.35)';    // red
const CURVE_STROKE = '#1C1C1E';
const BOUND_STROKE = '#FF9500';
const MEAN_STROKE = '#007AFF';
const GRID_STROKE = '#e0e0e0';

interface BoundaryRegion {
  /** 'left' = everything left of x is failure, 'right' = everything right of x is failure */
  side: 'left' | 'right';
  value: number;
}

/**
 * Determine which regions of the distribution are "failure" based on design intent.
 * Returns boundary lines + which side of each boundary is the failure region.
 */
function getFailureRegions(
  type: string,
  minGap: string | null,
  maxGap: string | null,
): BoundaryRegion[] {
  const lo = minGap !== null ? parseFloat(minGap) : null;
  const hi = maxGap !== null ? parseFloat(maxGap) : null;
  const regions: BoundaryRegion[] = [];

  switch (type) {
    case 'clearance':
      // Fail if x < minGap → left of minGap is failure
      if (lo !== null) regions.push({ side: 'left', value: lo });
      break;
    case 'interference':
      // Fail if x > minGap (upper) OR x < maxGap (lower)
      if (lo !== null) regions.push({ side: 'right', value: lo });
      if (hi !== null) regions.push({ side: 'left', value: hi });
      break;
    case 'proud':
      // Fail if x < minGap (or < 0)
      regions.push({ side: 'left', value: lo ?? 0 });
      break;
    case 'recess':
      // Fail if x > maxGap (or > 0)
      regions.push({ side: 'right', value: hi ?? 0 });
      break;
    case 'flush':
      // No explicit failure bounds
      break;
  }
  return regions;
}

function formatTick(v: number): string {
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(1);
  if (Number.isInteger(v)) return v.toString();
  const dp = Math.abs(v) < 0.1 ? 4 : Math.abs(v) < 1 ? 3 : 2;
  return v.toFixed(dp);
}

export function DistributionPlot() {
  const results = useProjectStore((s) => s.results);
  const target = useProjectStore((s) => s.target);
  const rows = useProjectStore((s) => s.rows);

  const plotData = useMemo(() => {
    if (rows.length === 0) return null;

    const mu = results.gap.toNumber();
    const rssTol = results.rssTolerance.toNumber();
    const sigma = rssTol / 3;

    if (sigma === 0) return null;

    // Plot range: μ ± 4.5σ
    const xMin = mu - 4.5 * sigma;
    const xMax = mu + 4.5 * sigma;
    const xStep = (xMax - xMin) / NUM_POINTS;

    // Generate curve points
    const points: { x: number; y: number }[] = [];
    let yMax = 0;
    for (let i = 0; i <= NUM_POINTS; i++) {
      const x = xMin + i * xStep;
      const y = normalPdf(x, mu, sigma);
      points.push({ x, y });
      if (y > yMax) yMax = y;
    }

    // Scale functions
    const sx = (x: number) => PAD_L + ((x - xMin) / (xMax - xMin)) * PLOT_W;
    const sy = (y: number) => PAD_T + PLOT_H - (y / (yMax * 1.08)) * PLOT_H;

    // Build curve path
    const curvePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`)
      .join(' ');

    // Failure regions
    const failRegions = getFailureRegions(target.type, target.minGap, target.maxGap);

    // For each failure region, build a filled SVG path under the curve
    const regionPaths: { d: string; fill: string; label: string; labelX: number }[] = [];

    for (const region of failRegions) {
      const bx = region.value;
      // Clamp boundary to visible range
      const clampedBx = Math.max(xMin, Math.min(xMax, bx));

      if (region.side === 'left') {
        // Failure is everything from xMin to boundary
        const failPts = points.filter((p) => p.x <= clampedBx);
        if (failPts.length > 1) {
          // Also add boundary point exactly
          const byVal = normalPdf(clampedBx, mu, sigma);
          const path =
            `M${sx(xMin).toFixed(2)},${sy(0).toFixed(2)} ` +
            failPts.map((p) => `L${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(' ') +
            ` L${sx(clampedBx).toFixed(2)},${sy(byVal).toFixed(2)}` +
            ` L${sx(clampedBx).toFixed(2)},${sy(0).toFixed(2)} Z`;
          regionPaths.push({ d: path, fill: FAIL_FILL, label: 'FAIL', labelX: sx((xMin + clampedBx) / 2) });
        }
      } else {
        // Failure is everything from boundary to xMax
        const failPts = points.filter((p) => p.x >= clampedBx);
        if (failPts.length > 1) {
          const byVal = normalPdf(clampedBx, mu, sigma);
          const path =
            `M${sx(clampedBx).toFixed(2)},${sy(0).toFixed(2)} ` +
            `L${sx(clampedBx).toFixed(2)},${sy(byVal).toFixed(2)} ` +
            failPts.map((p) => `L${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(' ') +
            ` L${sx(xMax).toFixed(2)},${sy(0).toFixed(2)} Z`;
          regionPaths.push({ d: path, fill: FAIL_FILL, label: 'FAIL', labelX: sx((clampedBx + xMax) / 2) });
        }
      }
    }

    // Build the "success" region = full curve minus failure regions
    // We build it as the full area under the curve, then failure regions overlay
    const fullAreaPath =
      `M${sx(xMin).toFixed(2)},${sy(0).toFixed(2)} ` +
      points.map((p) => `L${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`).join(' ') +
      ` L${sx(xMax).toFixed(2)},${sy(0).toFixed(2)} Z`;

    // Boundary lines (vertical dashed lines at each limit)
    const boundaryLines = failRegions.map((r) => {
      const bx = Math.max(xMin, Math.min(xMax, r.value));
      return {
        x: sx(bx),
        value: r.value,
        inRange: r.value >= xMin && r.value <= xMax,
      };
    });

    // X-axis ticks: μ, μ±σ, μ±2σ, μ±3σ
    const ticks: { x: number; label: string; bold?: boolean }[] = [];
    for (let s = -3; s <= 3; s++) {
      const val = mu + s * sigma;
      if (val >= xMin && val <= xMax) {
        ticks.push({
          x: sx(val),
          label: formatTick(val),
          bold: s === 0,
        });
      }
    }

    // σ labels on the axis
    const sigmaLabels: { x: number; label: string }[] = [];
    for (let s = -3; s <= 3; s++) {
      const val = mu + s * sigma;
      if (val >= xMin && val <= xMax) {
        sigmaLabels.push({
          x: sx(val),
          label: s === 0 ? 'μ' : `${s > 0 ? '+' : ''}${s}σ`,
        });
      }
    }

    return {
      mu,
      sigma,
      xMin,
      xMax,
      sx,
      sy,
      curvePath,
      fullAreaPath,
      regionPaths,
      boundaryLines,
      ticks,
      sigmaLabels,
      failureRate: results.rssFailureRate,
      yieldPct: results.rssYieldPercent,
    };
  }, [results, target, rows]);

  if (!plotData) {
    return (
      <div className="distribution-plot">
        <svg width={W} height={H}>
          <text x={W / 2} y={H / 2} textAnchor="middle" fill="#999" fontSize={12}>
            Add dimensions to see distribution
          </text>
        </svg>
      </div>
    );
  }

  const {
    curvePath,
    fullAreaPath,
    regionPaths,
    boundaryLines,
    ticks,
    sigmaLabels,
    failureRate,
    yieldPct,
  } = plotData;

  const frLabel =
    failureRate === 0
      ? '0 ppm'
      : failureRate < 0.000001
        ? `${(failureRate * 1e6).toFixed(2)} ppm`
        : failureRate < 0.01
          ? `${(failureRate * 100).toFixed(4)}%`
          : `${(failureRate * 100).toFixed(2)}%`;

  return (
    <div className="distribution-plot">
      <h4 className="distribution-title">RSS Distribution</h4>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid lines */}
        {ticks.map((t, i) => (
          <line
            key={`grid-${i}`}
            x1={t.x}
            y1={PAD_T}
            x2={t.x}
            y2={PAD_T + PLOT_H}
            stroke={GRID_STROKE}
            strokeWidth={0.5}
          />
        ))}

        {/* Full area under curve = success (green) */}
        <path d={fullAreaPath} fill={PASS_FILL} />

        {/* Failure regions overlay (red) */}
        {regionPaths.map((rp, i) => (
          <path key={`fail-${i}`} d={rp.d} fill={rp.fill} />
        ))}

        {/* Curve line */}
        <path d={curvePath} fill="none" stroke={CURVE_STROKE} strokeWidth={1.5} />

        {/* Mean line */}
        <line
          x1={ticks.find((t) => t.bold)?.x ?? 0}
          y1={PAD_T}
          x2={ticks.find((t) => t.bold)?.x ?? 0}
          y2={PAD_T + PLOT_H}
          stroke={MEAN_STROKE}
          strokeWidth={1}
          strokeDasharray="4 3"
        />

        {/* Boundary lines */}
        {boundaryLines.map(
          (bl, i) =>
            bl.inRange && (
              <g key={`bound-${i}`}>
                <line
                  x1={bl.x}
                  y1={PAD_T}
                  x2={bl.x}
                  y2={PAD_T + PLOT_H}
                  stroke={BOUND_STROKE}
                  strokeWidth={1.5}
                  strokeDasharray="6 3"
                />
                <text
                  x={bl.x}
                  y={PAD_T - 4}
                  textAnchor="middle"
                  fill={BOUND_STROKE}
                  fontSize={9}
                  fontWeight={600}
                >
                  {formatTick(bl.value)}
                </text>
              </g>
            ),
        )}

        {/* Failure region labels */}
        {regionPaths.map((rp, i) => (
          <text
            key={`fail-label-${i}`}
            x={rp.labelX}
            y={PAD_T + PLOT_H - 8}
            textAnchor="middle"
            fill="#c0392b"
            fontSize={9}
            fontWeight={700}
          >
            FAIL
          </text>
        ))}

        {/* X-axis baseline */}
        <line
          x1={PAD_L}
          y1={PAD_T + PLOT_H}
          x2={PAD_L + PLOT_W}
          y2={PAD_T + PLOT_H}
          stroke="#333"
          strokeWidth={1}
        />

        {/* X-axis ticks and value labels */}
        {ticks.map((t, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={t.x}
              y1={PAD_T + PLOT_H}
              x2={t.x}
              y2={PAD_T + PLOT_H + 4}
              stroke="#333"
              strokeWidth={1}
            />
            <text
              x={t.x}
              y={PAD_T + PLOT_H + 14}
              textAnchor="middle"
              fill="#333"
              fontSize={8}
              fontWeight={t.bold ? 700 : 400}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* σ labels row */}
        {sigmaLabels.map((sl, i) => (
          <text
            key={`sigma-${i}`}
            x={sl.x}
            y={PAD_T + PLOT_H + 24}
            textAnchor="middle"
            fill="#666"
            fontSize={8}
            fontStyle={sl.label === 'μ' ? 'normal' : 'italic'}
            fontWeight={sl.label === 'μ' ? 700 : 400}
          >
            {sl.label}
          </text>
        ))}

        {/* Y-axis label */}
        <text
          x={10}
          y={PAD_T + PLOT_H / 2}
          textAnchor="middle"
          fill="#999"
          fontSize={9}
          transform={`rotate(-90 10 ${PAD_T + PLOT_H / 2})`}
        >
          Probability Density
        </text>

        {/* Legend */}
        <rect x={PAD_L + 4} y={PAD_T + 2} width={8} height={8} rx={1} fill={PASS_FILL} stroke="rgba(52,199,89,0.6)" strokeWidth={0.5} />
        <text x={PAD_L + 15} y={PAD_T + 9} fill="#27ae60" fontSize={9} fontWeight={600}>
          Yield: {yieldPct.toFixed(2)}%
        </text>

        <rect x={PAD_L + 4} y={PAD_T + 14} width={8} height={8} rx={1} fill={FAIL_FILL} stroke="rgba(255,59,48,0.6)" strokeWidth={0.5} />
        <text x={PAD_L + 15} y={PAD_T + 21} fill="#c0392b" fontSize={9} fontWeight={600}>
          F/R: {frLabel}
        </text>
      </svg>
    </div>
  );
}
