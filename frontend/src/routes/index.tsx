import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useQuery } from "@tanstack/react-query";
import {
  callLogSearchSchema,
  callLogsQueryOptions,
  defaultCallLogSearch,
} from "../features/call-logs/api";
import { CallLogFilters } from "../features/call-logs/components/CallLogFilters";
import { CallLogTable } from "../features/call-logs/components/CallLogTable";
import { filterCallLogs } from "../features/call-logs/model";

export const Route = createFileRoute("/")({
  validateSearch: callLogSearchSchema,
  search: {
    middlewares: [stripSearchParams(defaultCallLogSearch)],
  },
  loader: async ({ context }) => {
    await context.queryClient.query(callLogsQueryOptions());
  },
  pendingComponent: () => <Typography>Loading...</Typography>,
  component: RouteComponent,
});

function RouteComponent() {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("sm"));
  const routeSearch = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data, isLoading, isError, error, refetch } = useQuery(
    callLogsQueryOptions(),
  );

  const callLogs = data?.call_logs ?? [];
  const countryCodes = [
    ...new Set(callLogs.map((log) => log.country_code)),
  ].sort();
  const filteredLogs = filterCallLogs(callLogs, routeSearch);

  function clearFilters() {
    void navigate({ search: defaultCallLogSearch, replace: true });
  }

  function renderCallLogContent() {
    if (isError) {
      return (
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
      );
    }

    if (isLoading) {
      return (
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
      );
    }

    if (callLogs.length === 0) {
      return (
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
      );
    }

    if (filteredLogs.length === 0) {
      return (
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
      );
    }

    return <CallLogTable rows={filteredLogs} compact={isCompact} />;
  }

  return (
    <Box
      component="main"
      sx={{ minHeight: "100vh", bgcolor: "background.default" }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        {/* Page header section */}
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
          <CallLogFilters
            filters={routeSearch}
            countryCodes={countryCodes}
            onChange={(filters) => {
              void navigate({ search: filters, replace: true });
            }}
            onClear={clearFilters}
          />

          {/* Call log summary section */}
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
          {/* Call log content section */}
          {renderCallLogContent()}
        </Box>
      </Container>
    </Box>
  );
}
