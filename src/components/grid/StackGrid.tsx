import { useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { CellValueChangedEvent, RowSelectedEvent, RowDragEndEvent } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { columnDefs } from './columnDefs';
import { createGridContext } from './cellRenderers';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { useSettingsStore } from '../../store/settingsStore';
import type { StackRow } from '../../types/grid';

ModuleRegistry.registerModules([AllCommunityModule]);

export function StackGrid() {
  const rows = useProjectStore((s) => s.rows);
  const derivedRows = useProjectStore((s) => s.derivedRows);
  const updateRow = useProjectStore((s) => s.updateRow);
  const reorderRows = useProjectStore((s) => s.reorderRows);
  const setSelectedRowId = useUiStore((s) => s.setSelectedRowId);
  const standards = useSettingsStore((s) => s.config.standards);

  const context = useMemo(
    () => createGridContext(derivedRows, standards),
    [derivedRows, standards],
  );

  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent<StackRow>) => {
      if (!event.data) return;
      const field = event.colDef.field;
      if (!field) return;

      const updates: Partial<StackRow> = { [field]: event.newValue };

      // Auto-sync: ±TOL -> +TOL/-TOL
      if (field === 'tolSymmetric' && event.newValue !== null && event.newValue !== '') {
        const val = event.newValue as string;
        updates.tolPlus = val;
        updates.tolMinus = `-${val}`;
      }

      // Override: +TOL or -TOL edited -> clear ±TOL (switch to asymmetric mode)
      if (field === 'tolPlus' || field === 'tolMinus') {
        updates.tolSymmetric = null;
      }

      updateRow(event.data.id, updates);
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

  const onRowDragEnd = useCallback(
    (event: RowDragEndEvent<StackRow>) => {
      const newRows: StackRow[] = [];
      event.api.forEachNode((node) => {
        if (node.data) newRows.push(node.data);
      });
      reorderRows(newRows);
    },
    [reorderRows],
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
        onRowDragEnd={onRowDragEnd}
        rowDragManaged={true}
        rowSelection="single"
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
        enableCellTextSelection={true}
        suppressClipboardPaste={false}
        domLayout="normal"
        tooltipShowDelay={300}
      />
    </div>
  );
}
