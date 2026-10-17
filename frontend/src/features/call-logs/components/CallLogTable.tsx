import Box from "@mui/material/Box";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import type { CallLog } from "../api";

const columns: GridColDef<CallLog>[] = [
  { field: "date", headerName: "Date", flex: 1, minWidth: 125 },
  { field: "time", headerName: "Time", flex: 0.8, minWidth: 105 },
  {
    field: "country_code",
    headerName: "Country code",
    flex: 0.9,
    minWidth: 125,
  },
  {
    field: "caller_number",
    headerName: "Caller number",
    flex: 1.3,
    minWidth: 155,
  },
];

interface CallLogTableProps {
  rows: CallLog[];
  compact: boolean;
}

export function CallLogTable({ rows, compact }: CallLogTableProps) {
  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        columnVisibilityModel={compact ? { time: false } : undefined}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { page: 0, pageSize: 10 } },
        }}
        sx={{ minHeight: 420 }}
      />
    </Box>
  );
}