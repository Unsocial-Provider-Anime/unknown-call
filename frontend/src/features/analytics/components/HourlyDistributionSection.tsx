import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { BarChart } from "@mui/x-charts/BarChart";
import { analyticsQueries } from "../api";
import { formatHour } from "../formatters";
import { getPeakHours } from "../model";

export function HourlyDistributionSection() {
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery(analyticsQueries.hourly());
  const points = data?.points ?? [];
  const { peakCount, hours } = getPeakHours(points);

  return (
    <Box
      component="section"
      aria-labelledby="hourly-distribution-heading"
      sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 4 }}
    >
      <Typography variant="h5" component="h2" id="hourly-distribution-heading">
        Hourly Distribution (Peak Hours)
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
            <CircularProgress
              size={24}
              aria-label="Loading hourly distribution"
            />
            <Typography color="text.secondary">
              Loading hourly distribution...
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
            Could not load hourly distribution: {error.message}
          </Alert>
        )}
        {!isPending && !isError && points.length === 0 && (
          <Box sx={{ py: 5 }}>
            <Typography variant="h6" component="h3">
              No hourly data available
            </Typography>
            <Typography color="text.secondary">
              There are no hourly call counts to display.
            </Typography>
          </Box>
        )}
        {!isPending && !isError && points.length > 0 && (
          <>
            <Typography color="text.secondary" role="status">
              {hours.length > 0
                ? `Peak: ${hours.map(formatHour).join(", ")} (${peakCount} ${peakCount === 1 ? "call" : "calls"})`
                : "No calls recorded."}
            </Typography>
            <Box
              tabIndex={0}
              role="region"
              aria-label="Scrollable hourly call distribution chart"
              sx={{ width: "100%", minWidth: 0, overflowX: "auto" }}
            >
              <Box
                role="img"
                aria-label={`Hourly call counts across ${points.length} hours`}
                sx={{ minWidth: 720 }}
              >
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      data: points.map((point) => formatHour(point.hour)),
                    },
                  ]}
                  yAxis={[{ min: 0, label: "Calls" }]}
                  series={[
                    {
                      data: points.map((point) => point.count),
                      label: "Calls",
                    },
                  ]}
                  height={320}
                  grid={{ horizontal: true }}
                  margin={{ left: 56, right: 24, top: 24, bottom: 48 }}
                />
              </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}