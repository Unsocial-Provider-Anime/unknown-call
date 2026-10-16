import { createFileRoute } from "@tanstack/react-router";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { LineChart } from "@mui/x-charts/LineChart";
import dayjs from "dayjs";
import { useState } from "react";
import { z } from "zod";

const volumePeriods = ["day", "week", "month", "year"] as const;
const volumePeriodSchema = z.enum(volumePeriods);
const volumeResponseSchema = z.object({
  period: volumePeriodSchema,
  points: z.array(
    z.object({
      date: z.iso.date(),
      count: z.number().int().nonnegative(),
    }),
  ),
});

type VolumePeriod = z.infer<typeof volumePeriodSchema>;

const periodLabels: Record<VolumePeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string") {
      return body.detail;
    }
  } catch {
    return response.statusText || `Request failed (${response.status}).`;
  }

  return response.statusText || `Request failed (${response.status}).`;
}

function formatBucketDate(value: Date, period: VolumePeriod): string {
  const date = dayjs(value);
  if (period === "year") {
    return date.format("YYYY");
  }
  if (period === "month") {
    return date.format("MMM YYYY");
  }
  return date.format("MMM D, YYYY");
}

export const Route = createFileRoute("/analysis")({
  component: RouteComponent,
});

function RouteComponent() {
  const [period, setPeriod] = useState<VolumePeriod>("day");
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["call-volume", period],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/calls/volume?period=${period}`,
        { signal },
      );
      if (!response.ok) {
        throw new Error(await responseError(response));
      }
      return volumeResponseSchema.parse(await response.json());
    },
  });
  const points = data?.points ?? [];

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
          {/* Analysis page header section */}
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
                Analysis
              </Typography>
            </Box>
          </Box>
          {/* Analysis page content section */}
          <Box
            component="section"
            id="analysis-content"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 3, md: 4 },
            }}
          >
            <Box component="section" id="Temporal and Time Series Analysis">
              <Typography variant="body1">
                Temporal and Time Series
              </Typography>
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
                  <Typography
                    variant="h5"
                    component="h2"
                    id="call-volume-heading"
                  >
                    Call Volume Trends Over Time
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id="call-volume-period-label">
                      Interval
                    </InputLabel>
                    <Select
                      labelId="call-volume-period-label"
                      id="call-volume-period"
                      value={period}
                      label="Interval"
                      onChange={(event) => {
                        const result = volumePeriodSchema.safeParse(
                          event.target.value,
                        );
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
                      <CircularProgress
                        size={24}
                        aria-label="Loading call volume"
                      />
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
                      role="img"
                      aria-label={`Call volume by ${period}, ${points.length} time periods`}
                      sx={{ width: "100%", minWidth: 0 }}
                    >
                      <LineChart
                        xAxis={[
                          {
                            data: points.map(
                              (point) => new Date(`${point.date}T00:00:00`),
                            ),
                            scaleType: "time",
                            valueFormatter: (value) =>
                              formatBucketDate(value, period),
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
                  )}
                </Box>
              </Box>
              <List>
                <ListItem>Hourly Distribution (Peak Hours)</ListItem>
                <ListItem>Day-of-the-Week Analysis</ListItem>
                <ListItem>Inter-arrival Time Analysis</ListItem>
              </List>
            </Box>
            <Box component="section" id="Frequency and Categorical Analysis">
              <Typography variant="body1">
                This is the analysis for Frequency and Categorical data.
              </Typography>
              <List>
                <ListItem>Caller Frequency Distribution</ListItem>
                <ListItem>Country Code Segmentation</ListItem>
                <ListItem>Call Burst & Clustering Analysis</ListItem>
              </List>
            </Box>
            <Box component="section" id="Anomaly and Outlier Detection">
              <Typography variant="body1">
                This is the analysis for Anomaly and Outlier Detection data.
              </Typography>
              <List>
                <ListItem>Volume Outliers</ListItem>
              </List>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
