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

  const context = useMemo(() => createGridContext(derivedRows), [derivedRows]);

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
