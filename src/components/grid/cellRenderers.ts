import type { StackRow, RowId } from '../../types/grid';
import type { DerivedRowData } from '../../store/projectStore';

export interface GridContext {
  derivedRows: Map<RowId, DerivedRowData>;
  getCenteredNominal: (data: StackRow) => string;
  getCenteredTolerance: (data: StackRow) => string;
  getPercentContribution: (data: StackRow) => string;
}

export function createGridContext(derivedRows: Map<RowId, DerivedRowData>): GridContext {
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
