import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { BarChart } from "@mui/x-charts/BarChart";
import { analyticsQueries } from "../api";
import { formatPValue, formatRate } from "../formatters";
import { hasObservedDayOfWeekData } from "../model";

export function DayOfWeekSection() {
  const { data, isPending, isError, error, refetch } = useQuery(
    analyticsQueries.dayOfWeek(),
  );
  const hasData = data ? hasObservedDayOfWeekData(data) : false;

  return (
    <Box
      component="section"
      aria-labelledby="day-of-week-heading"
      sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 4 }}
    >
      <Typography variant="h5" component="h2" id="day-of-week-heading">
        Day-of-the-Week Analysis
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
              aria-label="Loading day-of-week analysis"
            />
            <Typography color="text.secondary">
              Loading day-of-week analysis...
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
            Could not load day-of-week analysis: {error.message}
          </Alert>
        )}
        {!isPending && !isError && !hasData && (
          <Box sx={{ py: 5 }}>
            <Typography variant="h6" component="h3">
              No call records yet
            </Typography>
            <Typography color="text.secondary">
              There are no observed dates to compare.
            </Typography>
          </Box>
        )}
        {!isPending && !isError && hasData && data && (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: 2,
                maxWidth: 720,
              }}
            >
              {([
                ["Weekdays (Mon-Fri)", data.weekday],
                ["Weekend (Sat-Sun)", data.weekend],
              ] as const).map(([label, group]) => (
                <Box
                  key={label}
                  sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
                >
                  <Typography variant="subtitle2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="h6" component="p">
                    {formatRate(group.calls_per_day)} calls per day
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {group.call_count.toLocaleString()} calls across{" "}
                    {group.observed_days.toLocaleString()} observed days
                  </Typography>
                </Box>
              ))}
            </Box>
            <Box
              tabIndex={0}
              role="region"
              aria-label="Scrollable average call rates by day of week"
              sx={{ width: "100%", minWidth: 0, overflowX: "auto", mt: 2 }}
            >
              <Box
                role="img"
                aria-label="Average calls per observed date for each day of the week"
                sx={{ minWidth: 560 }}
              >
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      data: data.days.map((day) => day.day),
                    },
                  ]}
                  yAxis={[{ min: 0, label: "Calls per day" }]}
                  series={[
                    {
                      data: data.days.map((day) => day.calls_per_day),
                      label: "Average calls per day",
                    },
                  ]}
                  height={320}
                  grid={{ horizontal: true }}
                  margin={{ left: 72, right: 24, top: 24, bottom: 48 }}
                />
              </Box>
            </Box>
            {data.test_available ? (
              <Typography color="text.secondary" role="status">
                Weekday/weekend rate ratio: {data.rate_ratio === null
                  ? "∞"
                  : `${formatRate(data.rate_ratio)}×`}
                {data.confidence_interval_95 && (
                  <>
                    {" "}(95% CI{" "}
                    {formatRate(data.confidence_interval_95.lower)} to{" "}
                    {data.confidence_interval_95.upper === null
                      ? "∞"
                      : formatRate(data.confidence_interval_95.upper)})
                  </>
                )}
                {data.p_value !== null &&
                  `; exact p-value ${formatPValue(data.p_value)}`}
              </Typography>
            ) : (
              <Alert severity="info">
                {data.test_unavailable_reason ??
                  "A weekday/weekend comparison is not available."}
              </Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              Exact Poisson rate comparison; assumes independent calls at a
              stable rate over the observed date range.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}