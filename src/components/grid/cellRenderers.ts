import type { StackRow, RowId } from '../../types/grid';
import type { DerivedRowData } from '../../store/projectStore';
import type { ToleranceStandard } from '../../types/standards';
import { getSuggestion } from '../../engine/standards';

export interface GridContext {
  derivedRows: Map<RowId, DerivedRowData>;
  standards: ToleranceStandard[];
  getCenteredNominal: (data: StackRow) => string;
  getCenteredTolerance: (data: StackRow) => string;
  getPercentContribution: (data: StackRow) => string;
  getSuggestionText: (data: StackRow) => string;
  isTooTight: (data: StackRow) => boolean;
}

export function createGridContext(
  derivedRows: Map<RowId, DerivedRowData>,
  standards: ToleranceStandard[],
): GridContext {
  return {
    derivedRows,
    standards,

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

    getSuggestionText: (data: StackRow) => {
      const nom = parseFloat(data.nominal) || 0;
      const derived = derivedRows.get(data.id);
      const currentTol = derived ? derived.centeredTolerance.toNumber() : null;
      const suggestion = getSuggestion(data.toleranceSource, nom, currentTol, standards);
      if (!suggestion) return '';

      const lines = [
        `${suggestion.label} — ${suggestion.itGrade}`,
        `Suggested: ±${suggestion.suggestedTol.toFixed(4)} mm`,
        `Capability limit: ±${suggestion.capabilityLimit.toFixed(4)} mm`,
      ];
      if (suggestion.isTooTight) {
        lines.push('⚠ Tighter than process capability!');
      }
      return lines.join('\n');
    },

    isTooTight: (data: StackRow) => {
      const nom = parseFloat(data.nominal) || 0;
      const derived = derivedRows.get(data.id);
      const currentTol = derived ? derived.centeredTolerance.toNumber() : null;
      const suggestion = getSuggestion(data.toleranceSource, nom, currentTol, standards);
      return suggestion?.isTooTight ?? false;
    },
  };
}
