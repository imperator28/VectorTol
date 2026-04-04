# Phase 1: Portable Calculator (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Tauri desktop app with a high-density data grid for tolerance stack-up analysis, featuring Excel math parity, design intent validation, .vtol file save/load, and CSV export.

**Architecture:** Tauri v2 (Rust backend + React 18 frontend). AG Grid for the data entry table. Zustand for state management with derived calculations computed on-the-fly. decimal.js for all arithmetic. TypeScript strict mode throughout.

**Tech Stack:** Tauri v2, React 18, TypeScript (strict), AG Grid Community, Zustand, decimal.js, Vite

**Spec:** `docs/superpowers/specs/2026-04-03-vectortol-design.md`

---

## File Structure

```
vectortol/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                  # Tauri entry point, command registration
│   │   ├── commands/
│   │   │   ├── mod.rs               # Re-exports all commands
│   │   │   └── file_io.rs           # save_project, open_project, export_csv commands
│   │   └── lib.rs                   # Tauri lib setup
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── build.rs
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root layout: toolbar + grid + summary footer
│   ├── App.css                      # Global styles
│   ├── types/
│   │   ├── grid.ts                  # StackRow, ToleranceSource, RowId
│   │   ├── project.ts               # VtolFile, VtolMetadata, TargetScenario
│   │   └── standards.ts             # ToleranceConfig, ToleranceStandard (stub for Phase 4)
│   ├── engine/
│   │   ├── decimal.ts               # decimal.js wrapper: D() factory, constants
│   │   ├── calculations.ts          # centeredNominal, centeredTol, percentContribution
│   │   ├── worstCase.ts             # wcTolerance, wcMin, wcMax
│   │   └── rss.ts                   # rssTolerance, rssMin, rssMax
│   ├── store/
│   │   ├── projectStore.ts          # gridData[], metadata, target, derived results
│   │   ├── uiStore.ts               # selectedRowId, view preferences
│   │   └── settingsStore.ts         # ToleranceConfig (stub for Phase 4)
│   ├── components/
│   │   ├── grid/
│   │   │   ├── StackGrid.tsx        # AG Grid wrapper with column defs
│   │   │   ├── columnDefs.ts        # Column definitions array
│   │   │   └── cellRenderers.ts     # Custom renderers (direction toggle, source dropdown, % contribution bar)
│   │   ├── targets/
│   │   │   └── TargetPanel.tsx      # Design Intent target definition form
│   │   ├── summary/
│   │   │   └── ResultsFooter.tsx    # Live WC/RSS results with Pass/Fail badges
│   │   └── toolbar/
│   │       └── Toolbar.tsx          # File operations (New, Open, Save, Export CSV)
│   └── utils/
│       └── fileIO.ts                # Serialize/deserialize .vtol JSON, CSV generation
├── tests/
│   ├── engine/
│   │   ├── calculations.test.ts     # Unit tests for core calculations
│   │   ├── worstCase.test.ts        # Unit tests for WC analysis
│   │   └── rss.test.ts              # Unit tests for RSS analysis
│   └── utils/
│       └── fileIO.test.ts           # Serialization round-trip tests
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── index.html
```

---

## Task 1: Project Scaffold (Tauri + React + TypeScript)

**Files:**
- Create: All scaffold files (package.json, tsconfig.json, vite.config.ts, vitest.config.ts, index.html, src/main.tsx, src/App.tsx, src/App.css, src-tauri/*)

- [ ] **Step 1: Create the Tauri v2 project**

```bash
cd "/Users/jiyu/Library/CloudStorage/GoogleDrive-nickqianjiyu@gmail.com/My Drive/Miscellaneous/Vibe-Coding/VectorTol"
npm create tauri-app@latest vectortol -- --template react-ts --manager npm
```

When prompted, select:
- Package manager: npm
- UI template: React
- UI flavor: TypeScript

This creates a `vectortol/` subdirectory. We'll work inside it.

- [ ] **Step 2: Move scaffold contents to project root**

```bash
# Move everything from vectortol/ subdirectory to project root
cd "/Users/jiyu/Library/CloudStorage/GoogleDrive-nickqianjiyu@gmail.com/My Drive/Miscellaneous/Vibe-Coding/VectorTol"
mv vectortol/* vectortol/.* . 2>/dev/null; rmdir vectortol
```

- [ ] **Step 3: Install project dependencies**

```bash
npm install ag-grid-react ag-grid-community decimal.js zustand uuid jspdf jspdf-autotable
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/uuid
```

- [ ] **Step 4: Add Tauri plugins for file dialogs**

```bash
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs
cd src-tauri && cargo add tauri-plugin-dialog tauri-plugin-fs && cd ..
```

- [ ] **Step 5: Configure vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

- [ ] **Step 6: Configure TypeScript strict mode**

Update `tsconfig.json` to ensure strict mode:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 7: Configure CSP in tauri.conf.json**

In `src-tauri/tauri.conf.json`, ensure the security section blocks all external network:

```json
{
  "app": {
    "security": {
      "csp": "default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    }
  }
}
```

Also register the plugins in `src-tauri/src/lib.rs`:

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 8: Add npm scripts**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "tauri": "tauri"
  }
}
```

- [ ] **Step 9: Verify the scaffold builds**

```bash
npm run test -- --passWithNoTests
npm run build
```

Expected: Both commands succeed with no errors.

- [ ] **Step 10: Initialize git and commit**

```bash
git init
cat > .gitignore << 'EOF'
node_modules/
dist/
src-tauri/target/
*.exe
*.dmg
.DS_Store
EOF
git add -A
git commit -m "chore: scaffold Tauri v2 + React + TypeScript project"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types/grid.ts`
- Create: `src/types/project.ts`
- Create: `src/types/standards.ts`

- [ ] **Step 1: Create grid types**

Create `src/types/grid.ts`:

```typescript
export type RowId = string;

export type ToleranceSource =
  | 'machining'
  | 'mold'
  | 'material'
  | 'assembly'
  | 'stamping'
  | 'casting'
  | 'custom';

export const TOLERANCE_SOURCES: ToleranceSource[] = [
  'machining',
  'mold',
  'material',
  'assembly',
  'stamping',
  'casting',
  'custom',
];

export type Direction = 1 | -1;

export interface StackRow {
  id: RowId;
  component: string;
  dimId: string;
  toleranceSource: ToleranceSource;
  direction: Direction;
  nominal: string;           // Stored as string, parsed to Decimal for calculations
  tolSymmetric: string | null;
  tolPlus: string | null;
  tolMinus: string | null;
  rounding: number;
  sigma: string;             // Stored as string, default "3"
}

export function createEmptyRow(id: RowId): StackRow {
  return {
    id,
    component: '',
    dimId: '',
    toleranceSource: 'machining',
    direction: 1,
    nominal: '0',
    tolSymmetric: '0',
    tolPlus: null,
    tolMinus: null,
    rounding: 3,
    sigma: '3',
  };
}
```

- [ ] **Step 2: Create project types**

Create `src/types/project.ts`:

```typescript
import type { StackRow } from './grid';

export type TargetType = 'clearance' | 'interference' | 'flush' | 'proud' | 'recess';

export interface TargetScenario {
  type: TargetType;
  minGap: string | null;    // String decimal
  maxGap: string | null;    // String decimal
}

export interface VtolMetadata {
  projectName: string;
  author: string;
  createdAt: string;         // ISO 8601
  updatedAt: string;         // ISO 8601
  designIntent: TargetScenario;
}

export interface VtolFile {
  version: 1;
  metadata: VtolMetadata;
  gridData: StackRow[];
  canvasData: {
    vectors: [];              // Phase 2 — empty array for now
    image: null;              // Phase 2
    imageTransform: { x: 0; y: 0; scale: 1; rotation: 0 };
  };
  settings: Record<string, unknown>; // Phase 4 — placeholder
}
```

- [ ] **Step 3: Create standards types (stub)**

Create `src/types/standards.ts`:

```typescript
// Phase 4: Will hold ToleranceConfig, ToleranceStandard, CustomRule, DimensionRange
// Stubbed here so settingsStore has a type to reference

export interface ToleranceConfig {
  standards: [];       // Populated in Phase 4
  customRules: [];     // Populated in Phase 4
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript type definitions for grid, project, and standards"
```

---

## Task 3: Decimal Wrapper & Core Calculation Engine

**Files:**
- Create: `src/engine/decimal.ts`
- Create: `src/engine/calculations.ts`
- Create: `tests/engine/calculations.test.ts`

- [ ] **Step 1: Create the decimal.js wrapper**

Create `src/engine/decimal.ts`:

```typescript
import Decimal from 'decimal.js';

// Configure decimal.js for engineering precision
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

/** Factory: parse string to Decimal. Returns Decimal(0) for empty/invalid input. */
export function D(value: string | number | Decimal): Decimal {
  try {
    return new Decimal(value);
  } catch {
    return new Decimal(0);
  }
}

export { Decimal };
```

- [ ] **Step 2: Write failing tests for core calculations**

Create `tests/engine/calculations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  centeredNominal,
  centeredTolerance,
  percentContribution,
} from '../../src/engine/calculations';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';

function makeRow(overrides: Partial<StackRow>): StackRow {
  return { ...createEmptyRow('test-1'), ...overrides };
}

describe('centeredNominal', () => {
  it('returns nominal * direction for symmetric tolerance', () => {
    const row = makeRow({ nominal: '10', direction: 1, tolSymmetric: '0.05' });
    expect(centeredNominal(row).toNumber()).toBe(10);
  });

  it('returns negative nominal for direction = -1', () => {
    const row = makeRow({ nominal: '10', direction: -1, tolSymmetric: '0.05' });
    expect(centeredNominal(row).toNumber()).toBe(-10);
  });

  it('adjusts nominal for asymmetric tolerance', () => {
    // +0.03 / -0.01 -> meanShift = (0.03 + (-0.01)) / 2 = 0.01
    // centeredNominal = (10 + 0.01) * 1 = 10.01
    const row = makeRow({
      nominal: '10',
      direction: 1,
      tolSymmetric: null,
      tolPlus: '0.03',
      tolMinus: '-0.01',
    });
    expect(centeredNominal(row).toNumber()).toBe(10.01);
  });

  it('adjusts nominal for asymmetric with negative direction', () => {
    const row = makeRow({
      nominal: '10',
      direction: -1,
      tolSymmetric: null,
      tolPlus: '0.03',
      tolMinus: '-0.01',
    });
    expect(centeredNominal(row).toNumber()).toBe(-10.01);
  });
});

describe('centeredTolerance', () => {
  it('returns tolSymmetric for symmetric case', () => {
    const row = makeRow({ tolSymmetric: '0.05' });
    expect(centeredTolerance(row).toNumber()).toBe(0.05);
  });

  it('returns half-range for asymmetric case', () => {
    // (0.03 - (-0.01)) / 2 = 0.02
    const row = makeRow({
      tolSymmetric: null,
      tolPlus: '0.03',
      tolMinus: '-0.01',
    });
    expect(centeredTolerance(row).toNumber()).toBe(0.02);
  });

  it('returns 0 when no tolerance is set', () => {
    const row = makeRow({ tolSymmetric: null, tolPlus: null, tolMinus: null });
    expect(centeredTolerance(row).toNumber()).toBe(0);
  });
});

describe('percentContribution', () => {
  it('calculates contribution as percentage of total WC tolerance', () => {
    const row = makeRow({ tolSymmetric: '0.05' });
    // 0.05 / 0.20 * 100 = 25
    expect(percentContribution(row, '0.20')).toBe(25);
  });

  it('returns 0 when total WC tolerance is 0', () => {
    const row = makeRow({ tolSymmetric: '0.05' });
    expect(percentContribution(row, '0')).toBe(0);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm run test -- tests/engine/calculations.test.ts
```

Expected: FAIL — module `../../src/engine/calculations` not found.

- [ ] **Step 4: Implement core calculations**

Create `src/engine/calculations.ts`:

```typescript
import { D, Decimal } from './decimal';
import type { StackRow } from '../types/grid';

/** Returns true if the row uses asymmetric tolerances. */
function isAsymmetric(row: StackRow): boolean {
  return row.tolSymmetric === null && row.tolPlus !== null && row.tolMinus !== null;
}

/**
 * Centered Nominal:
 * - Symmetric: nominal * direction
 * - Asymmetric: (nominal + meanShift) * direction
 *   where meanShift = (tolPlus + tolMinus) / 2
 */
export function centeredNominal(row: StackRow): Decimal {
  const nom = D(row.nominal);
  if (isAsymmetric(row)) {
    const meanShift = D(row.tolPlus!).plus(D(row.tolMinus!)).dividedBy(2);
    return nom.plus(meanShift).times(row.direction);
  }
  return nom.times(row.direction);
}

/**
 * Centered Tolerance (always positive half-range):
 * - Symmetric: tolSymmetric
 * - Asymmetric: (tolPlus - tolMinus) / 2
 */
export function centeredTolerance(row: StackRow): Decimal {
  if (isAsymmetric(row)) {
    return D(row.tolPlus!).minus(D(row.tolMinus!)).dividedBy(2);
  }
  if (row.tolSymmetric !== null) {
    return D(row.tolSymmetric);
  }
  return D(0);
}

/**
 * % Contribution = (|centeredTol| / totalWcTol) * 100
 * Returns a rounded number. Returns 0 if totalWcTol is 0.
 */
export function percentContribution(row: StackRow, totalWcTol: string): number {
  const total = D(totalWcTol);
  if (total.isZero()) return 0;
  const ct = centeredTolerance(row).abs();
  return ct.dividedBy(total).times(100).toDecimalPlaces(2).toNumber();
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test -- tests/engine/calculations.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/decimal.ts src/engine/calculations.ts tests/engine/calculations.test.ts
git commit -m "feat: add decimal wrapper and core calculation engine with tests"
```

---

## Task 4: Worst-Case Analysis Engine

**Files:**
- Create: `src/engine/worstCase.ts`
- Create: `tests/engine/worstCase.test.ts`

- [ ] **Step 1: Write failing tests for worst-case analysis**

Create `tests/engine/worstCase.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { wcTolerance, wcMin, wcMax, wcGap } from '../../src/engine/worstCase';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';

function makeRow(overrides: Partial<StackRow>): StackRow {
  return { ...createEmptyRow('test'), ...overrides };
}

describe('worst-case analysis', () => {
  const rows: StackRow[] = [
    makeRow({ id: 'r1', nominal: '10', direction: 1, tolSymmetric: '0.05' }),
    makeRow({ id: 'r2', nominal: '5', direction: -1, tolSymmetric: '0.03' }),
    makeRow({ id: 'r3', nominal: '3', direction: 1, tolSymmetric: '0.02' }),
  ];

  it('computes gap as sum of centered nominals', () => {
    // 10 + (-5) + 3 = 8
    expect(wcGap(rows).toNumber()).toBe(8);
  });

  it('computes WC tolerance as sum of absolute centered tolerances', () => {
    // 0.05 + 0.03 + 0.02 = 0.10
    expect(wcTolerance(rows).toNumber()).toBe(0.1);
  });

  it('computes WC min = gap - wcTol', () => {
    // 8 - 0.10 = 7.90
    expect(wcMin(rows).toNumber()).toBe(7.9);
  });

  it('computes WC max = gap + wcTol', () => {
    // 8 + 0.10 = 8.10
    expect(wcMax(rows).toNumber()).toBe(8.1);
  });

  it('handles empty rows', () => {
    expect(wcGap([]).toNumber()).toBe(0);
    expect(wcTolerance([]).toNumber()).toBe(0);
    expect(wcMin([]).toNumber()).toBe(0);
    expect(wcMax([]).toNumber()).toBe(0);
  });

  it('handles asymmetric tolerances', () => {
    const asymRows: StackRow[] = [
      makeRow({
        id: 'a1',
        nominal: '10',
        direction: 1,
        tolSymmetric: null,
        tolPlus: '0.03',
        tolMinus: '-0.01',
      }),
    ];
    // centeredNominal = (10 + 0.01) * 1 = 10.01
    // centeredTol = (0.03 - (-0.01)) / 2 = 0.02
    expect(wcGap(asymRows).toNumber()).toBe(10.01);
    expect(wcTolerance(asymRows).toNumber()).toBe(0.02);
    expect(wcMin(asymRows).toNumber()).toBe(9.99);
    expect(wcMax(asymRows).toNumber()).toBe(10.03);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/engine/worstCase.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement worst-case analysis**

Create `src/engine/worstCase.ts`:

```typescript
import { D, Decimal } from './decimal';
import { centeredNominal, centeredTolerance } from './calculations';
import type { StackRow } from '../types/grid';

/** Gap = sum of centered nominals */
export function wcGap(rows: StackRow[]): Decimal {
  return rows.reduce((sum, row) => sum.plus(centeredNominal(row)), D(0));
}

/** WC Tolerance = sum of |centeredTol| */
export function wcTolerance(rows: StackRow[]): Decimal {
  return rows.reduce((sum, row) => sum.plus(centeredTolerance(row).abs()), D(0));
}

/** WC Min = gap - wcTolerance */
export function wcMin(rows: StackRow[]): Decimal {
  return wcGap(rows).minus(wcTolerance(rows));
}

/** WC Max = gap + wcTolerance */
export function wcMax(rows: StackRow[]): Decimal {
  return wcGap(rows).plus(wcTolerance(rows));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/engine/worstCase.test.ts
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/worstCase.ts tests/engine/worstCase.test.ts
git commit -m "feat: add worst-case tolerance analysis engine with tests"
```

---

## Task 5: RSS Analysis Engine

**Files:**
- Create: `src/engine/rss.ts`
- Create: `tests/engine/rss.test.ts`

- [ ] **Step 1: Write failing tests for RSS analysis**

Create `tests/engine/rss.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { rssTolerance, rssMin, rssMax } from '../../src/engine/rss';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';

function makeRow(overrides: Partial<StackRow>): StackRow {
  return { ...createEmptyRow('test'), ...overrides };
}

describe('RSS analysis', () => {
  const rows: StackRow[] = [
    makeRow({ id: 'r1', nominal: '10', direction: 1, tolSymmetric: '0.05' }),
    makeRow({ id: 'r2', nominal: '5', direction: -1, tolSymmetric: '0.03' }),
    makeRow({ id: 'r3', nominal: '3', direction: 1, tolSymmetric: '0.02' }),
  ];

  it('computes RSS tolerance = sqrt(sum of centeredTol^2)', () => {
    // sqrt(0.05^2 + 0.03^2 + 0.02^2) = sqrt(0.0025 + 0.0009 + 0.0004) = sqrt(0.0038) ≈ 0.06164
    const result = rssTolerance(rows).toDecimalPlaces(5).toNumber();
    expect(result).toBeCloseTo(0.06164, 4);
  });

  it('computes RSS min = gap - rssTol', () => {
    // gap = 8, rssTol ≈ 0.06164 -> min ≈ 7.93836
    const result = rssMin(rows).toDecimalPlaces(5).toNumber();
    expect(result).toBeCloseTo(7.93836, 4);
  });

  it('computes RSS max = gap + rssTol', () => {
    // gap = 8, rssTol ≈ 0.06164 -> max ≈ 8.06164
    const result = rssMax(rows).toDecimalPlaces(5).toNumber();
    expect(result).toBeCloseTo(8.06164, 4);
  });

  it('handles empty rows', () => {
    expect(rssTolerance([]).toNumber()).toBe(0);
    expect(rssMin([]).toNumber()).toBe(0);
    expect(rssMax([]).toNumber()).toBe(0);
  });

  it('handles single row', () => {
    const single = [makeRow({ nominal: '10', direction: 1, tolSymmetric: '0.05' })];
    // RSS of single value = the value itself
    expect(rssTolerance(single).toNumber()).toBe(0.05);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/engine/rss.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement RSS analysis**

Create `src/engine/rss.ts`:

```typescript
import { D, Decimal } from './decimal';
import { centeredTolerance } from './calculations';
import { wcGap } from './worstCase';
import type { StackRow } from '../types/grid';

/** RSS Tolerance = sqrt(sum of centeredTol^2) */
export function rssTolerance(rows: StackRow[]): Decimal {
  const sumOfSquares = rows.reduce(
    (sum, row) => {
      const ct = centeredTolerance(row);
      return sum.plus(ct.times(ct));
    },
    D(0),
  );
  return sumOfSquares.sqrt();
}

/** RSS Min = gap - rssTolerance */
export function rssMin(rows: StackRow[]): Decimal {
  return wcGap(rows).minus(rssTolerance(rows));
}

/** RSS Max = gap + rssTolerance */
export function rssMax(rows: StackRow[]): Decimal {
  return wcGap(rows).plus(rssTolerance(rows));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/engine/rss.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rss.ts tests/engine/rss.test.ts
git commit -m "feat: add RSS tolerance analysis engine with tests"
```

---

## Task 6: Zustand Stores

**Files:**
- Create: `src/store/projectStore.ts`
- Create: `src/store/uiStore.ts`
- Create: `src/store/settingsStore.ts`

- [ ] **Step 1: Create the project store**

Create `src/store/projectStore.ts`:

```typescript
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { StackRow, RowId } from '../types/grid';
import { createEmptyRow } from '../types/grid';
import type { VtolMetadata, TargetScenario } from '../types/project';
import { wcGap, wcTolerance, wcMin, wcMax } from '../engine/worstCase';
import { rssTolerance, rssMin, rssMax } from '../engine/rss';
import { centeredNominal, centeredTolerance, percentContribution } from '../engine/calculations';
import { D, Decimal } from '../engine/decimal';

export interface DerivedRowData {
  centeredNominal: Decimal;
  centeredTolerance: Decimal;
  percentContribution: number;
}

export interface AnalysisResults {
  gap: Decimal;
  wcTolerance: Decimal;
  wcMin: Decimal;
  wcMax: Decimal;
  rssTolerance: Decimal;
  rssMin: Decimal;
  rssMax: Decimal;
  wcPass: boolean;
  rssPass: boolean;
}

function evaluatePass(min: Decimal, max: Decimal, target: TargetScenario): boolean {
  const { type, minGap, maxGap } = target;
  const lo = minGap !== null ? D(minGap) : null;
  const hi = maxGap !== null ? D(maxGap) : null;

  switch (type) {
    case 'clearance':
      // Gap must be > minGap at worst case
      return lo !== null ? min.gte(lo) : true;
    case 'interference':
      // Gap must be between maxGap and minGap (both negative)
      return (lo === null || max.lte(lo)) && (hi === null || min.gte(hi));
    case 'flush':
      // Gap should be ~0: WC range must include 0
      return min.lte(0) && max.gte(0);
    case 'proud':
      // Gap > 0 (positive step)
      return lo !== null ? min.gte(lo) : min.gt(0);
    case 'recess':
      // Gap < 0 (negative step)
      return hi !== null ? max.lte(hi) : max.lt(0);
  }
}

function computeResults(rows: StackRow[], target: TargetScenario): AnalysisResults {
  const gap = wcGap(rows);
  const wcTol = wcTolerance(rows);
  const wcMinVal = wcMin(rows);
  const wcMaxVal = wcMax(rows);
  const rssTol = rssTolerance(rows);
  const rssMinVal = rssMin(rows);
  const rssMaxVal = rssMax(rows);

  return {
    gap,
    wcTolerance: wcTol,
    wcMin: wcMinVal,
    wcMax: wcMaxVal,
    rssTolerance: rssTol,
    rssMin: rssMinVal,
    rssMax: rssMaxVal,
    wcPass: evaluatePass(wcMinVal, wcMaxVal, target),
    rssPass: evaluatePass(rssMinVal, rssMaxVal, target),
  };
}

function computeDerivedRow(row: StackRow, totalWcTol: string): DerivedRowData {
  return {
    centeredNominal: centeredNominal(row),
    centeredTolerance: centeredTolerance(row),
    percentContribution: percentContribution(row, totalWcTol),
  };
}

interface ProjectState {
  // Data
  metadata: VtolMetadata;
  rows: StackRow[];
  target: TargetScenario;
  isDirty: boolean;
  currentFilePath: string | null;

  // Derived (recomputed on every row/target change)
  results: AnalysisResults;
  derivedRows: Map<RowId, DerivedRowData>;

  // Actions
  addRow: () => void;
  removeRow: (id: RowId) => void;
  updateRow: (id: RowId, updates: Partial<StackRow>) => void;
  setTarget: (target: TargetScenario) => void;
  setMetadata: (metadata: Partial<VtolMetadata>) => void;
  recompute: () => void;
  loadProject: (metadata: VtolMetadata, rows: StackRow[], target: TargetScenario, filePath: string | null) => void;
  newProject: () => void;
  setFilePath: (path: string | null) => void;
  markClean: () => void;
}

const defaultTarget: TargetScenario = { type: 'clearance', minGap: '0', maxGap: null };

const defaultMetadata: VtolMetadata = {
  projectName: 'Untitled',
  author: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  designIntent: defaultTarget,
};

export const useProjectStore = create<ProjectState>((set, get) => {
  function recomputeState(rows: StackRow[], target: TargetScenario) {
    const results = computeResults(rows, target);
    const totalWcTol = results.wcTolerance.toString();
    const derivedRows = new Map<RowId, DerivedRowData>();
    for (const row of rows) {
      derivedRows.set(row.id, computeDerivedRow(row, totalWcTol));
    }
    return { results, derivedRows };
  }

  const initialRows: StackRow[] = [];
  const { results, derivedRows } = recomputeState(initialRows, defaultTarget);

  return {
    metadata: defaultMetadata,
    rows: initialRows,
    target: defaultTarget,
    isDirty: false,
    currentFilePath: null,
    results,
    derivedRows,

    addRow: () => {
      const state = get();
      const newRow = createEmptyRow(uuidv4());
      const rows = [...state.rows, newRow];
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    removeRow: (id: RowId) => {
      const state = get();
      const rows = state.rows.filter((r) => r.id !== id);
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    updateRow: (id: RowId, updates: Partial<StackRow>) => {
      const state = get();
      const rows = state.rows.map((r) => (r.id === id ? { ...r, ...updates } : r));
      const computed = recomputeState(rows, state.target);
      set({ rows, isDirty: true, ...computed });
    },

    setTarget: (target: TargetScenario) => {
      const state = get();
      const computed = recomputeState(state.rows, target);
      set({ target, isDirty: true, ...computed });
    },

    setMetadata: (updates: Partial<VtolMetadata>) => {
      const state = get();
      set({ metadata: { ...state.metadata, ...updates }, isDirty: true });
    },

    recompute: () => {
      const state = get();
      const computed = recomputeState(state.rows, state.target);
      set(computed);
    },

    loadProject: (metadata, rows, target, filePath) => {
      const computed = recomputeState(rows, target);
      set({ metadata, rows, target, currentFilePath: filePath, isDirty: false, ...computed });
    },

    newProject: () => {
      const computed = recomputeState([], defaultTarget);
      set({
        metadata: { ...defaultMetadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        rows: [],
        target: defaultTarget,
        currentFilePath: null,
        isDirty: false,
        ...computed,
      });
    },

    setFilePath: (path) => set({ currentFilePath: path }),
    markClean: () => set({ isDirty: false }),
  };
});
```

- [ ] **Step 2: Create the UI store**

Create `src/store/uiStore.ts`:

```typescript
import { create } from 'zustand';
import type { RowId } from '../types/grid';

interface UiState {
  selectedRowId: RowId | null;
  setSelectedRowId: (id: RowId | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedRowId: null,
  setSelectedRowId: (id) => set({ selectedRowId: id }),
}));
```

- [ ] **Step 3: Create the settings store (stub)**

Create `src/store/settingsStore.ts`:

```typescript
import { create } from 'zustand';
import type { ToleranceConfig } from '../types/standards';

interface SettingsState {
  config: ToleranceConfig;
  setConfig: (config: ToleranceConfig) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  config: { standards: [], customRules: [] },
  setConfig: (config) => set({ config }),
}));
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/
git commit -m "feat: add Zustand stores for project state, UI, and settings"
```

---

## Task 7: File I/O Utilities

**Files:**
- Create: `src/utils/fileIO.ts`
- Create: `tests/utils/fileIO.test.ts`

- [ ] **Step 1: Write failing tests for serialization**

Create `tests/utils/fileIO.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { serializeProject, deserializeProject, rowsToCsv } from '../../src/utils/fileIO';
import type { StackRow } from '../../src/types/grid';
import { createEmptyRow } from '../../src/types/grid';
import type { VtolMetadata, TargetScenario } from '../../src/types/project';

const testTarget: TargetScenario = { type: 'clearance', minGap: '0.05', maxGap: null };

const testMetadata: VtolMetadata = {
  projectName: 'Test Project',
  author: 'Engineer',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  designIntent: testTarget,
};

const testRows: StackRow[] = [
  {
    ...createEmptyRow('row-1'),
    component: 'Housing',
    dimId: 'D1',
    nominal: '10.5',
    tolSymmetric: '0.05',
    direction: 1,
  },
  {
    ...createEmptyRow('row-2'),
    component: 'PCB',
    dimId: 'D2',
    nominal: '1.6',
    tolSymmetric: null,
    tolPlus: '0.03',
    tolMinus: '-0.01',
    direction: -1,
  },
];

describe('serializeProject / deserializeProject', () => {
  it('round-trips project data', () => {
    const json = serializeProject(testMetadata, testRows, testTarget);
    const parsed = deserializeProject(json);

    expect(parsed.metadata.projectName).toBe('Test Project');
    expect(parsed.gridData).toHaveLength(2);
    expect(parsed.gridData[0].component).toBe('Housing');
    expect(parsed.gridData[1].tolPlus).toBe('0.03');
    expect(parsed.metadata.designIntent.type).toBe('clearance');
    expect(parsed.version).toBe(1);
  });

  it('includes canvas stub data', () => {
    const json = serializeProject(testMetadata, testRows, testTarget);
    const parsed = deserializeProject(json);
    expect(parsed.canvasData.vectors).toEqual([]);
    expect(parsed.canvasData.image).toBeNull();
  });
});

describe('rowsToCsv', () => {
  it('generates CSV with headers and row data', () => {
    const csv = rowsToCsv(testRows);
    const lines = csv.split('\n');

    expect(lines[0]).toContain('Component');
    expect(lines[0]).toContain('Dim ID');
    expect(lines[0]).toContain('Nominal');
    expect(lines[1]).toContain('Housing');
    expect(lines[1]).toContain('10.5');
    expect(lines[2]).toContain('PCB');
  });

  it('handles empty rows', () => {
    const csv = rowsToCsv([]);
    const lines = csv.split('\n').filter((l) => l.trim() !== '');
    expect(lines).toHaveLength(1); // Header only
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/utils/fileIO.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement file I/O utilities**

Create `src/utils/fileIO.ts`:

```typescript
import type { StackRow } from '../types/grid';
import type { VtolFile, VtolMetadata, TargetScenario } from '../types/project';

export function serializeProject(
  metadata: VtolMetadata,
  rows: StackRow[],
  target: TargetScenario,
): string {
  const file: VtolFile = {
    version: 1,
    metadata: {
      ...metadata,
      updatedAt: new Date().toISOString(),
      designIntent: target,
    },
    gridData: rows,
    canvasData: {
      vectors: [],
      image: null,
      imageTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
    },
    settings: {},
  };
  return JSON.stringify(file, null, 2);
}

export function deserializeProject(json: string): VtolFile {
  const file = JSON.parse(json) as VtolFile;
  if (file.version !== 1) {
    throw new Error(`Unsupported .vtol version: ${file.version}`);
  }
  return file;
}

const CSV_HEADERS = [
  'Component',
  'Dim ID',
  'Tolerance Source',
  'Direction',
  'Nominal',
  '+/- TOL',
  '+TOL',
  '-TOL',
  'Rounding',
  'Sigma',
];

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: StackRow[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];
  for (const row of rows) {
    const fields = [
      row.component,
      row.dimId,
      row.toleranceSource,
      row.direction === 1 ? '+' : '-',
      row.nominal,
      row.tolSymmetric ?? '',
      row.tolPlus ?? '',
      row.tolMinus ?? '',
      String(row.rounding),
      row.sigma,
    ];
    lines.push(fields.map(escapeCsvField).join(','));
  }
  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test -- tests/utils/fileIO.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/fileIO.ts tests/utils/fileIO.test.ts
git commit -m "feat: add .vtol file serialization and CSV export utilities with tests"
```

---

## Task 8: AG Grid Data Grid Component

**Files:**
- Create: `src/components/grid/columnDefs.ts`
- Create: `src/components/grid/cellRenderers.ts`
- Create: `src/components/grid/StackGrid.tsx`

- [ ] **Step 1: Create column definitions**

Create `src/components/grid/columnDefs.ts`:

```typescript
import type { ColDef } from 'ag-grid-community';
import { TOLERANCE_SOURCES } from '../../types/grid';

export const columnDefs: ColDef[] = [
  {
    headerName: '#',
    valueGetter: (params) => params.node?.rowIndex != null ? params.node.rowIndex + 1 : '',
    width: 50,
    editable: false,
    sortable: false,
    filter: false,
  },
  {
    field: 'component',
    headerName: 'Component',
    editable: true,
    width: 140,
  },
  {
    field: 'dimId',
    headerName: 'Dim ID',
    editable: true,
    width: 80,
  },
  {
    field: 'toleranceSource',
    headerName: 'Tol Source',
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: TOLERANCE_SOURCES },
    width: 110,
  },
  {
    field: 'direction',
    headerName: '+/-',
    editable: true,
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values: [1, -1] },
    valueFormatter: (params) => (params.value === 1 ? '+' : '-'),
    width: 55,
  },
  {
    field: 'nominal',
    headerName: 'Nominal',
    editable: true,
    width: 90,
    type: 'rightAligned',
  },
  {
    field: 'tolSymmetric',
    headerName: '± TOL',
    editable: true,
    width: 80,
    type: 'rightAligned',
  },
  {
    field: 'tolPlus',
    headerName: '+TOL',
    editable: true,
    width: 75,
    type: 'rightAligned',
  },
  {
    field: 'tolMinus',
    headerName: '-TOL',
    editable: true,
    width: 75,
    type: 'rightAligned',
  },
  {
    field: 'rounding',
    headerName: 'Round',
    editable: true,
    width: 65,
    type: 'rightAligned',
  },
  {
    field: 'sigma',
    headerName: 'σ',
    editable: true,
    width: 55,
    type: 'rightAligned',
  },
  {
    headerName: 'Ctr Nom',
    editable: false,
    width: 85,
    type: 'rightAligned',
    valueGetter: 'ctx.getCenteredNominal(data)',
    cellStyle: { fontWeight: 'bold' },
  },
  {
    headerName: 'Ctr TOL',
    editable: false,
    width: 80,
    type: 'rightAligned',
    valueGetter: 'ctx.getCenteredTolerance(data)',
  },
  {
    headerName: '% Contrib',
    editable: false,
    width: 95,
    type: 'rightAligned',
    valueGetter: 'ctx.getPercentContribution(data)',
    cellStyle: (params) => {
      const val = params.value as number;
      if (val > 25) return { color: '#dc2626', fontWeight: 'bold' };
      return null;
    },
  },
];
```

- [ ] **Step 2: Create cell renderers**

Create `src/components/grid/cellRenderers.ts`:

```typescript
import type { StackRow, RowId } from '../../types/grid';
import type { DerivedRowData } from '../../store/projectStore';

export interface GridContext {
  derivedRows: Map<RowId, DerivedRowData>;
  getCenteredNominal: (data: StackRow) => string;
  getCenteredTolerance: (data: StackRow) => string;
  getPercentContribution: (data: StackRow) => string;
}

export function createGridContext(derivedRows: Map<RowId, DerivedRowData>, rounding: number): GridContext {
  return {
    derivedRows,
    getCenteredNominal: (data: StackRow) => {
      const derived = derivedRows.get(data.id);
      if (!derived) return '';
      return derived.centeredNominal.toDecimalPlaces(data.rounding).toString();
    },
    getCenteredTolerance: (data: StackRow) => {
      const derived = derivedRows.get(data.id);
      if (!derived) return '';
      return derived.centeredTolerance.toDecimalPlaces(data.rounding).toString();
    },
    getPercentContribution: (data: StackRow) => {
      const derived = derivedRows.get(data.id);
      if (!derived) return '';
      return derived.percentContribution.toFixed(1);
    },
  };
}
```

- [ ] **Step 3: Create the StackGrid component**

Create `src/components/grid/StackGrid.tsx`:

```tsx
import { useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellValueChangedEvent, RowSelectedEvent } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { columnDefs } from './columnDefs';
import { createGridContext } from './cellRenderers';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import type { StackRow } from '../../types/grid';

ModuleRegistry.registerModules([AllCommunityModule]);

export function StackGrid() {
  const rows = useProjectStore((s) => s.rows);
  const derivedRows = useProjectStore((s) => s.derivedRows);
  const updateRow = useProjectStore((s) => s.updateRow);
  const setSelectedRowId = useUiStore((s) => s.setSelectedRowId);

  const context = useMemo(() => createGridContext(derivedRows, 3), [derivedRows]);

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<StackRow>) => {
      if (!event.data) return;
      const field = event.colDef.field;
      if (!field) return;
      updateRow(event.data.id, { [field]: event.newValue });
    },
    [updateRow],
  );

  const onRowSelected = useCallback(
    (event: RowSelectedEvent<StackRow>) => {
      if (event.node.isSelected() && event.data) {
        setSelectedRowId(event.data.id);
      }
    },
    [setSelectedRowId],
  );

  return (
    <div style={{ flex: 1, width: '100%' }}>
      <AgGridReact<StackRow>
        rowData={rows}
        columnDefs={columnDefs}
        context={context}
        getRowId={(params) => params.data.id}
        onCellValueChanged={onCellValueChanged}
        onRowSelected={onRowSelected}
        rowSelection="single"
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        enableCellTextSelection={true}
        suppressClipboardPaste={false}
        domLayout="normal"
      />
    </div>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/grid/
git commit -m "feat: add AG Grid data grid component with column defs and cell renderers"
```

---

## Task 9: Design Intent Target Panel

**Files:**
- Create: `src/components/targets/TargetPanel.tsx`

- [ ] **Step 1: Create the TargetPanel component**

Create `src/components/targets/TargetPanel.tsx`:

```tsx
import { useCallback } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { TargetType, TargetScenario } from '../../types/project';

const TARGET_TYPES: { value: TargetType; label: string; description: string }[] = [
  { value: 'clearance', label: 'Clearance', description: 'Gap must be > min' },
  { value: 'interference', label: 'Interference', description: 'Gap between min and max (negative)' },
  { value: 'flush', label: 'Flush', description: 'Gap ≈ 0' },
  { value: 'proud', label: 'Proud', description: 'Gap > 0 (positive step)' },
  { value: 'recess', label: 'Recess', description: 'Gap < 0 (negative step)' },
];

export function TargetPanel() {
  const target = useProjectStore((s) => s.target);
  const setTarget = useProjectStore((s) => s.setTarget);

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const type = e.target.value as TargetType;
      const defaults: Record<TargetType, Partial<TargetScenario>> = {
        clearance: { minGap: '0', maxGap: null },
        interference: { minGap: null, maxGap: '-0.01' },
        flush: { minGap: null, maxGap: null },
        proud: { minGap: '0.10', maxGap: null },
        recess: { minGap: null, maxGap: '-0.10' },
      };
      setTarget({ type, ...defaults[type] } as TargetScenario);
    },
    [setTarget],
  );

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTarget({ ...target, minGap: e.target.value || null });
    },
    [target, setTarget],
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTarget({ ...target, maxGap: e.target.value || null });
    },
    [target, setTarget],
  );

  return (
    <div className="target-panel">
      <h3>Design Intent</h3>
      <div className="target-fields">
        <label>
          Type:
          <select value={target.type} onChange={handleTypeChange}>
            {TARGET_TYPES.map((t) => (
              <option key={t.value} value={t.value} title={t.description}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min Gap:
          <input
            type="text"
            value={target.minGap ?? ''}
            onChange={handleMinChange}
            placeholder="e.g. 0.05"
          />
        </label>
        <label>
          Max Gap:
          <input
            type="text"
            value={target.maxGap ?? ''}
            onChange={handleMaxChange}
            placeholder="e.g. -0.02"
          />
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/targets/
git commit -m "feat: add Design Intent target definition panel"
```

---

## Task 10: Live Results Footer

**Files:**
- Create: `src/components/summary/ResultsFooter.tsx`

- [ ] **Step 1: Create the ResultsFooter component**

Create `src/components/summary/ResultsFooter.tsx`:

```tsx
import { useProjectStore } from '../../store/projectStore';

function formatDecimal(val: { toDecimalPlaces: (n: number) => { toString: () => string } }, dp: number = 4): string {
  return val.toDecimalPlaces(dp).toString();
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
        <span className="result-value">{formatDecimal(results.gap)}</span>
      </div>

      <div className="results-section">
        <h4>Worst Case</h4>
        <table className="results-table">
          <tbody>
            <tr>
              <td>Tolerance:</td>
              <td className="result-value">{formatDecimal(results.wcTolerance)}</td>
            </tr>
            <tr>
              <td>Min:</td>
              <td className="result-value">{formatDecimal(results.wcMin)}</td>
            </tr>
            <tr>
              <td>Max:</td>
              <td className="result-value">{formatDecimal(results.wcMax)}</td>
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
              <td className="result-value">{formatDecimal(results.rssTolerance)}</td>
            </tr>
            <tr>
              <td>Min:</td>
              <td className="result-value">{formatDecimal(results.rssMin)}</td>
            </tr>
            <tr>
              <td>Max:</td>
              <td className="result-value">{formatDecimal(results.rssMax)}</td>
            </tr>
          </tbody>
        </table>
        <span className={`pass-badge ${results.rssPass ? 'pass' : 'fail'}`}>
          {results.rssPass ? 'PASS' : 'FAIL'}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/summary/
git commit -m "feat: add live results footer with WC/RSS analysis and Pass/Fail badges"
```

---

## Task 11: Toolbar with File Operations

**Files:**
- Create: `src/components/toolbar/Toolbar.tsx`

- [ ] **Step 1: Create the Toolbar component**

Create `src/components/toolbar/Toolbar.tsx`:

```tsx
import { useCallback } from 'react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useProjectStore } from '../../store/projectStore';
import { serializeProject, deserializeProject, rowsToCsv } from '../../utils/fileIO';

export function Toolbar() {
  const metadata = useProjectStore((s) => s.metadata);
  const rows = useProjectStore((s) => s.rows);
  const target = useProjectStore((s) => s.target);
  const isDirty = useProjectStore((s) => s.isDirty);
  const currentFilePath = useProjectStore((s) => s.currentFilePath);
  const addRow = useProjectStore((s) => s.addRow);
  const removeRow = useProjectStore((s) => s.removeRow);
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);
  const setFilePath = useProjectStore((s) => s.setFilePath);
  const markClean = useProjectStore((s) => s.markClean);
  const selectedRowId = (await import('../../store/uiStore')).useUiStore.getState().selectedRowId;

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    newProject();
  }, [isDirty, newProject]);

  const handleOpen = useCallback(async () => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    const filePath = await open({
      filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
    });
    if (!filePath) return;
    const content = await readTextFile(filePath);
    const file = deserializeProject(content);
    loadProject(file.metadata, file.gridData, file.metadata.designIntent, filePath);
  }, [isDirty, loadProject]);

  const handleSave = useCallback(async () => {
    let filePath = currentFilePath;
    if (!filePath) {
      const selected = await save({
        filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
        defaultPath: `${metadata.projectName}.vtol`,
      });
      if (!selected) return;
      filePath = selected;
    }
    const json = serializeProject(metadata, rows, target);
    await writeTextFile(filePath, json);
    setFilePath(filePath);
    markClean();
  }, [currentFilePath, metadata, rows, target, setFilePath, markClean]);

  const handleSaveAs = useCallback(async () => {
    const filePath = await save({
      filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
      defaultPath: `${metadata.projectName}.vtol`,
    });
    if (!filePath) return;
    const json = serializeProject(metadata, rows, target);
    await writeTextFile(filePath, json);
    setFilePath(filePath);
    markClean();
  }, [metadata, rows, target, setFilePath, markClean]);

  const handleExportCsv = useCallback(async () => {
    const filePath = await save({
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      defaultPath: `${metadata.projectName}.csv`,
    });
    if (!filePath) return;
    const csv = rowsToCsv(rows);
    await writeTextFile(filePath, csv);
  }, [metadata, rows]);

  const handleDeleteRow = useCallback(() => {
    if (selectedRowId) {
      removeRow(selectedRowId);
    }
  }, [selectedRowId, removeRow]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={handleNew} title="New Project">New</button>
        <button onClick={handleOpen} title="Open .vtol file">Open</button>
        <button onClick={handleSave} title="Save">Save{isDirty ? ' *' : ''}</button>
        <button onClick={handleSaveAs} title="Save As...">Save As</button>
      </div>
      <div className="toolbar-group">
        <button onClick={addRow} title="Add Row">+ Row</button>
        <button onClick={handleDeleteRow} title="Delete Selected Row">- Row</button>
      </div>
      <div className="toolbar-group">
        <button onClick={handleExportCsv} title="Export CSV">CSV</button>
      </div>
      <div className="toolbar-info">
        <span>{metadata.projectName}{isDirty ? ' (unsaved)' : ''}</span>
      </div>
    </div>
  );
}
```

**Note:** The dynamic import of `useUiStore` in the component body is incorrect. Let me fix that:

- [ ] **Step 2: Fix the Toolbar — use proper import**

Replace the `selectedRowId` line. The corrected `Toolbar.tsx` should import `useUiStore` at the top:

```tsx
import { useCallback } from 'react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { serializeProject, deserializeProject, rowsToCsv } from '../../utils/fileIO';

export function Toolbar() {
  const metadata = useProjectStore((s) => s.metadata);
  const rows = useProjectStore((s) => s.rows);
  const target = useProjectStore((s) => s.target);
  const isDirty = useProjectStore((s) => s.isDirty);
  const currentFilePath = useProjectStore((s) => s.currentFilePath);
  const addRow = useProjectStore((s) => s.addRow);
  const removeRow = useProjectStore((s) => s.removeRow);
  const loadProject = useProjectStore((s) => s.loadProject);
  const newProject = useProjectStore((s) => s.newProject);
  const setFilePath = useProjectStore((s) => s.setFilePath);
  const markClean = useProjectStore((s) => s.markClean);
  const selectedRowId = useUiStore((s) => s.selectedRowId);

  const handleNew = useCallback(() => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    newProject();
  }, [isDirty, newProject]);

  const handleOpen = useCallback(async () => {
    if (isDirty && !window.confirm('Unsaved changes will be lost. Continue?')) return;
    const filePath = await open({
      filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
    });
    if (!filePath) return;
    const content = await readTextFile(filePath);
    const file = deserializeProject(content);
    loadProject(file.metadata, file.gridData, file.metadata.designIntent, filePath);
  }, [isDirty, loadProject]);

  const handleSave = useCallback(async () => {
    let filePath = currentFilePath;
    if (!filePath) {
      const selected = await save({
        filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
        defaultPath: `${metadata.projectName}.vtol`,
      });
      if (!selected) return;
      filePath = selected;
    }
    const json = serializeProject(metadata, rows, target);
    await writeTextFile(filePath, json);
    setFilePath(filePath);
    markClean();
  }, [currentFilePath, metadata, rows, target, setFilePath, markClean]);

  const handleSaveAs = useCallback(async () => {
    const filePath = await save({
      filters: [{ name: 'VectorTol', extensions: ['vtol'] }],
      defaultPath: `${metadata.projectName}.vtol`,
    });
    if (!filePath) return;
    const json = serializeProject(metadata, rows, target);
    await writeTextFile(filePath, json);
    setFilePath(filePath);
    markClean();
  }, [metadata, rows, target, setFilePath, markClean]);

  const handleExportCsv = useCallback(async () => {
    const filePath = await save({
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      defaultPath: `${metadata.projectName}.csv`,
    });
    if (!filePath) return;
    const csv = rowsToCsv(rows);
    await writeTextFile(filePath, csv);
  }, [metadata, rows]);

  const handleDeleteRow = useCallback(() => {
    if (selectedRowId) {
      removeRow(selectedRowId);
    }
  }, [selectedRowId, removeRow]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={handleNew} title="New Project">New</button>
        <button onClick={handleOpen} title="Open .vtol file">Open</button>
        <button onClick={handleSave} title="Save">Save{isDirty ? ' *' : ''}</button>
        <button onClick={handleSaveAs} title="Save As...">Save As</button>
      </div>
      <div className="toolbar-group">
        <button onClick={addRow} title="Add Row">+ Row</button>
        <button onClick={handleDeleteRow} title="Delete Selected Row">- Row</button>
      </div>
      <div className="toolbar-group">
        <button onClick={handleExportCsv} title="Export CSV">CSV</button>
      </div>
      <div className="toolbar-info">
        <span>{metadata.projectName}{isDirty ? ' (unsaved)' : ''}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/toolbar/
git commit -m "feat: add toolbar with file operations (new, open, save, export CSV)"
```

---

## Task 12: App Layout & Styling

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/main.tsx`

- [ ] **Step 1: Update App.tsx with the main layout**

Replace `src/App.tsx` with:

```tsx
import { StackGrid } from './components/grid/StackGrid';
import { TargetPanel } from './components/targets/TargetPanel';
import { ResultsFooter } from './components/summary/ResultsFooter';
import { Toolbar } from './components/toolbar/Toolbar';
import './App.css';

export function App() {
  return (
    <div className="app">
      <Toolbar />
      <div className="main-content">
        <div className="sidebar">
          <TargetPanel />
        </div>
        <div className="grid-container">
          <StackGrid />
        </div>
      </div>
      <ResultsFooter />
    </div>
  );
}
```

- [ ] **Step 2: Add application styles**

Replace `src/App.css` with:

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  color: #1a1a1a;
  background: #f5f5f5;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #ffffff;
  border-bottom: 1px solid #e0e0e0;
}

.toolbar-group {
  display: flex;
  gap: 4px;
  padding-right: 8px;
  border-right: 1px solid #e0e0e0;
}

.toolbar-group:last-of-type {
  border-right: none;
}

.toolbar button {
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
}

.toolbar button:hover {
  background: #e8e8e8;
}

.toolbar-info {
  margin-left: auto;
  color: #666;
  font-size: 12px;
}

/* Main content */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  padding: 12px;
  background: #ffffff;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.grid-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* Target Panel */
.target-panel h3 {
  font-size: 14px;
  margin-bottom: 10px;
  color: #333;
}

.target-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.target-fields label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: #555;
}

.target-fields select,
.target-fields input {
  padding: 4px 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 12px;
}

/* Results Footer */
.results-footer {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  padding: 10px 16px;
  background: #ffffff;
  border-top: 2px solid #e0e0e0;
  min-height: 80px;
}

.results-empty {
  color: #999;
  font-style: italic;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.results-section h4 {
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.5px;
}

.results-table {
  font-size: 12px;
}

.results-table td {
  padding: 1px 8px 1px 0;
}

.result-value {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-weight: 600;
}

.pass-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  margin-top: 4px;
}

.pass-badge.pass {
  background: #dcfce7;
  color: #166534;
}

.pass-badge.fail {
  background: #fee2e2;
  color: #991b1b;
}
```

- [ ] **Step 3: Ensure main.tsx renders the App**

Verify `src/main.tsx` contains:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Run a full build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/App.css src/main.tsx
git commit -m "feat: add app layout with toolbar, sidebar, grid, and results footer"
```

---

## Task 13: Tauri Backend — File I/O Commands

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/commands/mod.rs`
- Create: `src-tauri/src/commands/file_io.rs`

- [ ] **Step 1: Create Rust file I/O commands**

Create `src-tauri/src/commands/mod.rs`:

```rust
pub mod file_io;
```

Create `src-tauri/src/commands/file_io.rs`:

```rust
use std::fs;
use tauri::command;

#[command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}
```

- [ ] **Step 2: Register commands in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
mod commands;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::file_io::read_file,
            commands::file_io::write_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Verify Rust compiles**

```bash
cd src-tauri && cargo check && cd ..
```

Expected: Compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/
git commit -m "feat: add Tauri Rust backend with file I/O commands"
```

---

## Task 14: Integration Test — Full Tauri Dev Run

- [ ] **Step 1: Run all unit tests**

```bash
npm run test
```

Expected: All tests pass (calculations, worstCase, rss, fileIO).

- [ ] **Step 2: Launch Tauri dev mode**

```bash
npm run tauri dev
```

Expected: The app window opens showing the toolbar, sidebar with Design Intent panel, empty grid area, and results footer saying "Add dimensions to see analysis results."

- [ ] **Step 3: Manually verify core workflows**

1. Click "+ Row" — a new row appears in the grid
2. Enter component name, nominal value, tolerance
3. Results footer updates live with Gap, WC, RSS values
4. Change Design Intent type — Pass/Fail updates
5. Click "Save" — native file dialog opens, saves .vtol file
6. Click "New" then "Open" — reload the saved file, data restored
7. Click "CSV" — export works

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 MVP complete — portable tolerance calculator"
```

---

## Future Phase Plans (to be written separately)

- **Phase 2:** `docs/superpowers/plans/YYYY-MM-DD-phase2-visual-canvas.md` — Canvas pane, image import, vector drawing, bi-directional sync
- **Phase 3:** `docs/superpowers/plans/YYYY-MM-DD-phase3-reporting-engine.md` — PDF generation, XLSX export, report layout
- **Phase 4:** `docs/superpowers/plans/YYYY-MM-DD-phase4-intelligent-support.md` — Tolerance standards config, smart suggestions, Monte Carlo (Rust), histogram visualization
