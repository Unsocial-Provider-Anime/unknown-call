import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { analyticsQueries, type CallerFrequencyResponse } from "../api";

type TopCaller = CallerFrequencyResponse["top_callers"][number];

const columns: GridColDef<TopCaller>[] = [
  { field: "country_code", headerName: "Country code", flex: 1, minWidth: 130 },
  {
    field: "caller_number",
    headerName: "Recorded caller number",
    flex: 2,
    minWidth: 210,
  },
  {
    field: "call_count",
    headerName: "Calls",
    type: "number",
    flex: 1,
    minWidth: 90,
  },
];

function getCallerId(caller: TopCaller): string {
  return JSON.stringify([caller.country_code, caller.caller_number]);
}

export function CallerFrequencySection() {
  const { data, isPending, isError, error, refetch } = useQuery(
    analyticsQueries.callerFrequency(),
  );

  return (
    <Box
      component="section"
      aria-labelledby="caller-frequency-heading"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mt: 4,
        minWidth: 0,
      }}
    >
      <Typography variant="h5" component="h2" id="caller-frequency-heading">
        Caller Frequency Distribution
      </Typography>
      <Box sx={{ minHeight: 320 }} aria-live="polite">
        {isPending && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              minHeight: 320,
            }}
          >
            <CircularProgress size={24} aria-label="Loading caller frequency" />
            <Typography color="text.secondary">
              Loading caller frequency...
            </Typography>
          </Box>
        )}
        {isError && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  void refetch();
                }}
              >
                Retry
              </Button>
            }
          >
            Could not load caller frequency: {error.message}
          </Alert>
        )}
        {!isPending && !isError && data && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "repeat(2, minmax(0, 1fr))",
                  lg: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
              }}
            >
              {(
                [
                  ["Total Calls", data.summary.total_calls],
                  ["Distinct Callers", data.summary.distinct_callers],
                  ["One-time Callers", data.summary.one_time_callers],
                  ["Repeat Callers", data.summary.repeat_callers],
                ] as const
              ).map(([label, count]) => (
                <Box
                  key={label}
                  role="group"
                  aria-label={label}
                  sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="h6" component="p">
                    {count.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
            {data.summary.distinct_callers === 0 ? (
              <Typography variant="h6" component="h3" sx={{ py: 5 }}>
                No callers recorded
              </Typography>
            ) : (
              <>
                <Box
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable caller frequency chart"
                  sx={{ width: "100%", minWidth: 0, overflowX: "auto" }}
                >
                  <Box
                    role="img"
                    aria-label={`Caller frequency distribution: ${data.distribution.map((point) => `${point.calls_per_caller} ${point.calls_per_caller === 1 ? "call" : "calls"}: ${point.caller_count} ${point.caller_count === 1 ? "caller" : "callers"}`).join("; ")}`}
                    sx={{ minWidth: 560 }}
                  >
                    <BarChart
                      xAxis={[
                        {
                          scaleType: "band",
                          data: data.distribution.map(
                            (point) => point.calls_per_caller,
                          ),
                          label: "Calls per caller",
                        },
                      ]}
                      yAxis={[{ min: 0, tickMinStep: 1, label: "Callers" }]}
                      series={[
                        {
                          data: data.distribution.map(
                            (point) => point.caller_count,
                          ),
                          label: "Callers",
                        },
                      ]}
                      height={320}
                      grid={{ horizontal: true }}
                      margin={{ left: 64, right: 24, top: 24, bottom: 48 }}
                    />
                  </Box>
                </Box>
                <Box
                  component="section"
                  aria-labelledby="top-callers-heading"
                  sx={{ minWidth: 0 }}
                >
                  <Typography
                    variant="h6"
                    component="h3"
                    id="top-callers-heading"
                    sx={{ mb: 2 }}
                  >
                    Top 10 Repeat Callers
                  </Typography>
                  <Box sx={{ width: "100%", minWidth: 0, height: 420 }}>
                    <DataGrid
                      aria-label="Top repeat callers"
                      rows={data.top_callers}
                      columns={columns}
                      getRowId={getCallerId}
                      disableRowSelectionOnClick
                      hideFooter
                    />
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
