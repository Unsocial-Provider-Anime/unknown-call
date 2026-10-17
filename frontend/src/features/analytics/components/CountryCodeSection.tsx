import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { analyticsQueries, type CountryCodeDistributionResponse } from "../api";

type Country = CountryCodeDistributionResponse["countries"][number];

const columns: GridColDef<Country>[] = [
  { field: "country_code", headerName: "Country code", minWidth: 130, flex: 1 },
  {
    field: "call_count",
    headerName: "Calls",
    type: "number",
    minWidth: 100,
    flex: 1,
  },
  {
    field: "call_share",
    headerName: "Call share",
    type: "number",
    minWidth: 110,
    flex: 1,
    valueFormatter: (value: number) => `${(value * 100).toFixed(1)}%`,
  },
  {
    field: "distinct_callers",
    headerName: "Callers",
    type: "number",
    minWidth: 100,
    flex: 1,
  },
  {
    field: "repeat_callers",
    headerName: "Repeat callers",
    type: "number",
    minWidth: 130,
    flex: 1,
  },
  {
    field: "calls_per_caller",
    headerName: "Calls per caller",
    type: "number",
    minWidth: 140,
    flex: 1,
    valueFormatter: (value: number) =>
      value.toLocaleString("en-US", { maximumFractionDigits: 2 }),
  },
];

export function CountryCodeSection() {
  const { data, isPending, isError, error, refetch } = useQuery(
    analyticsQueries.countryCodes(),
  );

  return (
    <Box
      component="section"
      aria-labelledby="country-code-heading"
      sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 4 }}
    >
      <Typography variant="h5" component="h2" id="country-code-heading">
        Country Code Segmentation
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
              aria-label="Loading country code distribution"
            />
            <Typography color="text.secondary">
              Loading country code distribution...
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
            Could not load country code distribution: {error.message}
          </Alert>
        )}
        {!isPending && !isError && data && (
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
              {(
                [
                  ["Total Calls", data.summary.total_calls],
                  ["Country Codes", data.summary.distinct_country_codes],
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
            {data.countries.length === 0 ? (
              <Typography variant="h6" component="h3" sx={{ py: 5 }}>
                No country codes recorded
              </Typography>
            ) : (
              <>
                <Box
                  tabIndex={0}
                  role="region"
                  aria-label="Scrollable calls by country code chart"
                  sx={{ width: "100%", minWidth: 0, overflowX: "auto", mt: 2 }}
                >
                  <Box
                    role="img"
                    aria-label={`Calls by country code: ${data.countries.map((country) => `${country.country_code}: ${country.call_count} ${country.call_count === 1 ? "call" : "calls"}`).join("; ")}`}
                    sx={{ minWidth: 560 }}
                  >
                    <BarChart
                      xAxis={[
                        {
                          scaleType: "band",
                          data: data.countries.map(
                            (country) => country.country_code,
                          ),
                          label: "Country code",
                        },
                      ]}
                      yAxis={[{ min: 0, tickMinStep: 1, label: "Calls" }]}
                      series={[
                        {
                          data: data.countries.map(
                            (country) => country.call_count,
                          ),
                          label: "Calls",
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
                  aria-label="Country code call statistics"
                  sx={{ width: "100%", minWidth: 0, height: 420, mt: 2 }}
                >
                  <DataGrid
                    aria-label="Country code call statistics"
                    rows={data.countries}
                    columns={columns}
                    getRowId={(country) => country.country_code}
                    disableRowSelectionOnClick
                    hideFooter
                  />
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
