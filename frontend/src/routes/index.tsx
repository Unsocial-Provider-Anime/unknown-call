import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

const callLogSchema = z.object({
  id: z.number(),
  date: z.string(),
  time: z.string(),
  country_code: z.string(),
  caller_number: z.string(),
});

type CallLog = z.infer<typeof callLogSchema>;

const callLogsResponseSchema = z.object({
  call_logs: z.array(callLogSchema),
});

type CallLogsResponse = z.infer<typeof callLogsResponseSchema>;

type CallLogFilters = {
  search: string;
  countryCode: string;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: CallLogFilters = {
  search: "",
  countryCode: "all",
  dateFrom: "",
  dateTo: "",
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

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

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    const detail = body.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      const messages = detail.map((item: unknown) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String(item.msg);
        }
        return String(item);
      });
      if (messages.length > 0) {
        return messages.join("; ");
      }
    }

    if (
      typeof detail === "object" &&
      detail !== null &&
      "missing_columns" in detail &&
      Array.isArray(detail.missing_columns)
    ) {
      return `Missing required columns: ${detail.missing_columns.join(", ")}`;
    }
  } catch {
    return response.statusText || `Request failed (${response.status}).`;
  }

  return response.statusText || `Request failed (${response.status}).`;
}

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));
  const { control, register, reset } = useForm<CallLogFilters>({
    defaultValues: defaultFilters,
  });
  const filters = useWatch({ control });
  const search = filters?.search ?? defaultFilters.search;
  const countryCode = filters?.countryCode ?? defaultFilters.countryCode;
  const dateFrom = filters?.dateFrom ?? defaultFilters.dateFrom;
  const dateTo = filters?.dateTo ?? defaultFilters.dateTo;

  const { data, isLoading, isError, error, refetch } = useQuery<
    CallLogsResponse,
    Error
  >({
    queryKey: ["call_logs"] as const,
    queryFn: async ({ signal }) => {
      const response = await fetch(`${API_BASE_URL}/api/calls/list`, {
        signal,
      });
      if (!response.ok) {
        throw new Error(await responseError(response));
      }
      return callLogsResponseSchema.parse(await response.json());
    },
  });

  const callLogs = data?.call_logs ?? [];
  const countryCodes = [
    ...new Set(callLogs.map((log) => log.country_code)),
  ].sort();
  const normalizedSearch = search.trim().toLowerCase();
  const filteredLogs = callLogs.filter((log) => {
    const searchableText =
      `${log.date} ${log.time} ${log.country_code} ${log.caller_number}`.toLowerCase();
    return (
      (!normalizedSearch || searchableText.includes(normalizedSearch)) &&
      (countryCode === "all" || log.country_code === countryCode) &&
      (!dateFrom || log.date >= dateFrom) &&
      (!dateTo || log.date <= dateTo)
    );
  });
  const hasFilters = Boolean(
    normalizedSearch || countryCode !== "all" || dateFrom || dateTo,
  );

  function clearFilters() {
    reset(defaultFilters);
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: "100vh", bgcolor: "background.default" }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 3, md: 4 },
          }}
        >
          <Box
            component="header"
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", md: "flex-end" },
              justifyContent: "space-between",
              flexDirection: { xs: "column", md: "row" },
              gap: 2.5,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="h4" component="h1">
                Unknown Call
              </Typography>
            </Box>
          </Box>

          <Box
            component="form"
            aria-label="Call log filters"
            onSubmit={(event) => {
              event.preventDefault();
            }}
            sx={{
              py: 2,
              borderTop: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 1.5,
                alignItems: { xs: "stretch", md: "center" },
              }}
            >
              <TextField
                label="Search calls"
                placeholder="Number, country code, date..."
                {...register("search")}
                size="small"
                sx={{ flex: 1, minWidth: { md: 220 } }}
              />
              <FormControl
                size="small"
                sx={{ minWidth: { xs: "100%", md: 165 } }}
              >
                <InputLabel id="country-filter-label">Country code</InputLabel>
                <Controller
                  name="countryCode"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="country-filter-label"
                      label="Country code"
                    >
                      <MenuItem value="all">All country codes</MenuItem>
                      {countryCodes.map((code) => (
                        <MenuItem key={code} value={code}>
                          {code}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <Controller
                name="dateFrom"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="From"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(value) => {
                      field.onChange(
                        value?.isValid() ? value.format("YYYY-MM-DD") : "",
                      );
                    }}
                    slotProps={{ textField: { size: "small" } }}
                    sx={{ minWidth: { xs: "100%", md: 155 } }}
                  />
                )}
              />
              <Controller
                name="dateTo"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="To"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(value) => {
                      field.onChange(
                        value?.isValid() ? value.format("YYYY-MM-DD") : "",
                      );
                    }}
                    slotProps={{ textField: { size: "small" } }}
                    sx={{ minWidth: { xs: "100%", md: 155 } }}
                  />
                )}
              />
              <Button
                variant="text"
                color="inherit"
                disabled={!hasFilters}
                onClick={clearFilters}
                sx={{
                  alignSelf: { xs: "flex-start", md: "center" },
                  whiteSpace: "nowrap",
                }}
              >
                Clear filters
              </Button>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {isError
                ? "Call records are unavailable"
                : `Showing ${filteredLogs.length} of ${callLogs.length} calls`}
            </Typography>
          </Box>

          {isError ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    refetch();
                  }}
                >
                  Retry
                </Button>
              }
            >
              Could not load call records: {error.message}
            </Alert>
          ) : isLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1.5,
                minHeight: 360,
                color: "text.secondary",
              }}
            >
              <CircularProgress size={28} aria-label="Loading call records" />
              <Typography variant="body2">Loading call records...</Typography>
            </Box>
          ) : callLogs.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 1.5,
                py: { xs: 5, md: 8 },
                maxWidth: 520,
              }}
            >
              <Typography variant="h6" component="h2">
                No call records yet
              </Typography>
              <Typography color="text.secondary">
                There are no call records to display.
              </Typography>
            </Box>
          ) : filteredLogs.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 1,
                py: 6,
              }}
            >
              <Typography variant="h6" component="h2">
                No matching calls
              </Typography>
              <Typography color="text.secondary">
                Adjust the search or filters to see call records.
              </Typography>
              <Button onClick={clearFilters}>Clear filters</Button>
            </Box>
          ) : (
            <Box sx={{ width: "100%", minWidth: 0 }}>
              <DataGrid
                rows={filteredLogs}
                columns={columns}
                columnVisibilityModel={isCompact ? { time: false } : undefined}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 25, 50]}
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 10 } },
                }}
                sx={{
                  minHeight: 420,
                }}
              />
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  );
}
