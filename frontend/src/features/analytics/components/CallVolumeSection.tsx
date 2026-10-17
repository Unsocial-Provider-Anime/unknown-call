import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "@mui/x-charts/LineChart";
import { useState } from "react";
import {
  analyticsQueries,
  volumePeriodSchema,
  volumePeriods,
  type VolumePeriod,
} from "../api";
import { formatBucketDate } from "../formatters";

const periodLabels: Record<VolumePeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

export function CallVolumeSection() {
  const [period, setPeriod] = useState<VolumePeriod>("day");
  const { data, isPending, isError, error, refetch } = useQuery(
    analyticsQueries.volume(period),
  );
  const points = data?.points ?? [];

  return (
    <Box
      component="section"
      aria-labelledby="call-volume-heading"
      sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Typography variant="h5" component="h2" id="call-volume-heading">
          Call Volume Trends Over Time
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="call-volume-period-label">Interval</InputLabel>
          <Select
            labelId="call-volume-period-label"
            id="call-volume-period"
            value={period}
            label="Interval"
            onChange={(event) => {
              const result = volumePeriodSchema.safeParse(event.target.value);
              if (result.success) {
                setPeriod(result.data);
              }
            }}
          >
            {volumePeriods.map((value) => (
              <MenuItem key={value} value={value}>
                {periodLabels[value]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ minHeight: 360 }} aria-live="polite">
        {isPending && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              minHeight: 360,
            }}
          >
            <CircularProgress size={24} aria-label="Loading call volume" />
            <Typography color="text.secondary">
              Loading call volume...
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
            Could not load call volume: {error.message}
          </Alert>
        )}
        {!isPending && !isError && points.length === 0 && (
          <Box sx={{ py: 5 }}>
            <Typography variant="h6" component="h3">
              No call records yet
            </Typography>
            <Typography color="text.secondary">
              There are no calls to plot for this period.
            </Typography>
          </Box>
        )}
        {!isPending && !isError && points.length > 0 && (
          <Box
            tabIndex={0}
            role="region"
            aria-label="Scrollable call volume chart"
            sx={{ width: "100%", minWidth: 0, overflowX: "auto" }}
          >
            <Box
              role="img"
              aria-label={`Call volume by ${period}, ${points.length} time periods`}
              sx={{ minWidth: 720 }}
            >
              <LineChart
                xAxis={[
                  {
                    data: points.map(
                      (point) => new Date(`${point.date}T00:00:00`),
                    ),
                    scaleType: "time",
                    valueFormatter: (value) => formatBucketDate(value, period),
                  },
                ]}
                yAxis={[{ min: 0, label: "Calls" }]}
                series={[
                  {
                    data: points.map((point) => point.count),
                    label: "Calls",
                    showMark: true,
                    curve: "linear",
                  },
                ]}
                height={360}
                grid={{ horizontal: true }}
                margin={{ left: 56, right: 24, top: 24, bottom: 48 }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}