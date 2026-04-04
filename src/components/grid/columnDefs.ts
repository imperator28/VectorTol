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
    headerName: '\u00b1 TOL',
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
    headerName: '\u03c3',
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
