import type { ColDef, CellClassParams } from 'ag-grid-community';
import { TOLERANCE_SOURCES } from '../../types/grid';

export const columnDefs: ColDef[] = [
  {
    headerName: '#',
    valueGetter: (params) => params.node?.rowIndex != null ? params.node.rowIndex + 1 : '',
    width: 50,
    editable: false,
    sortable: false,
    filter: false,
    rowDrag: true,
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
    headerName: '+/−',
    editable: false,
    width: 52,
    valueFormatter: (params) => (params.value === 1 ? '+' : '−'),
    cellStyle: (params: CellClassParams) => ({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: '15px',
      cursor: 'pointer',
      borderRadius: 'var(--radius-sm)',
      color: params.value === 1 ? 'var(--dir-pos-text)' : 'var(--dir-neg-text)',
      background: params.value === 1 ? 'var(--dir-pos-bg)' : 'var(--dir-neg-bg)',
    }),
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
    headerName: '\u00b1 TOL',
    headerTooltip: 'Symmetric tolerance. Auto-fills +TOL and -TOL. Hover a cell to see ISO 286 suggestion for the row\'s process.',
    editable: true,
    width: 80,
    type: 'rightAligned',
    tooltipValueGetter: (params) => {
      if (!params.data || !params.context?.getSuggestionText) return '';
      return params.context.getSuggestionText(params.data) || '';
    },
    cellStyle: (params: CellClassParams) => {
      if (!params.data) return null;
      const tight = params.context?.isTooTight?.(params.data) ?? false;
      if (tight) {
        return { color: '#dc2626', fontWeight: 'bold', border: '1px solid #fca5a5' };
      }
      return null;
    },
  },
  {
    field: 'tolPlus',
    headerName: '+TOL',
    headerTooltip: 'Upper tolerance limit. Auto-filled from \u00b1TOL. Edit to override (switches to asymmetric mode).',
    editable: true,
    width: 75,
    type: 'rightAligned',
    cellStyle: (params: CellClassParams) => {
      // Grey when auto-synced from \u00b1TOL, normal when in asymmetric override mode
      if (params.data?.tolSymmetric !== null && params.data?.tolSymmetric !== '') {
        return { color: '#999' };
      }
      return null;
    },
  },
  {
    field: 'tolMinus',
    headerName: '-TOL',
    headerTooltip: 'Lower tolerance limit (negative value). Auto-filled from \u00b1TOL. Edit to override.',
    editable: true,
    width: 75,
    type: 'rightAligned',
    cellStyle: (params: CellClassParams) => {
      if (params.data?.tolSymmetric !== null && params.data?.tolSymmetric !== '') {
        return { color: '#999' };
      }
      return null;
    },
  },
  {
    field: 'rounding',
    headerName: 'Round',
    headerTooltip: 'Decimal places for display (0\u20136). Does not affect internal calculation precision.',
    editable: true,
    width: 65,
    type: 'rightAligned',
  },
  {
    field: 'sigma',
    headerName: '\u03c3',
    headerTooltip: 'Process sigma level (default 3). Used for RSS statistical analysis. 3\u03c3 = 99.73% yield, 6\u03c3 = 99.99966% yield.',
    editable: true,
    width: 55,
    type: 'rightAligned',
  },
  {
    headerName: 'Ctr Nom',
    editable: false,
    width: 85,
    type: 'rightAligned',
    valueGetter: (params) => {
      if (!params.data || !params.context?.getCenteredNominal) return '';
      return params.context.getCenteredNominal(params.data);
    },
    cellStyle: { fontWeight: 'bold' },
  },
  {
    headerName: 'Ctr TOL',
    editable: false,
    width: 80,
    type: 'rightAligned',
    valueGetter: (params) => {
      if (!params.data || !params.context?.getCenteredTolerance) return '';
      return params.context.getCenteredTolerance(params.data);
    },
  },
  {
    headerName: '% Contrib',
    editable: false,
    width: 95,
    type: 'rightAligned',
    valueGetter: (params) => {
      if (!params.data || !params.context?.getPercentContribution) return '';
      return params.context.getPercentContribution(params.data);
    },
    cellStyle: (params: CellClassParams) => {
      const val = parseFloat(params.value as string);
      if (val > 25) return { color: '#dc2626', fontWeight: 'bold' };
      return null;
    },
  },
];
