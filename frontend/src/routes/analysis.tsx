import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { analyticsQueries } from "../features/analytics/api";
import { CallVolumeSection } from "../features/analytics/components/CallVolumeSection";
import { CallerFrequencySection } from "../features/analytics/components/CallerFrequencySection";
import { CountryCodeSection } from "../features/analytics/components/CountryCodeSection";
import { DayOfWeekSection } from "../features/analytics/components/DayOfWeekSection";
import { HourlyDistributionSection } from "../features/analytics/components/HourlyDistributionSection";
import { noop } from "@tanstack/react-query";

export const Route = createFileRoute("/analysis")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(analyticsQueries.volume("day")).catch(noop),
      context.queryClient.query(analyticsQueries.hourly()).catch(noop),
      context.queryClient.query(analyticsQueries.dayOfWeek()).catch(noop),
      context.queryClient.query(analyticsQueries.callerFrequency()).catch(noop),
      context.queryClient.query(analyticsQueries.countryCodes()).catch(noop),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
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
            <Typography variant="h4" component="h1">
              Analysis
            </Typography>
          </Box>
          <Box
            component="section"
            id="analysis-content"
            sx={{ display: "flex", flexDirection: "column", gap: { xs: 3, md: 4 } }}
          >
            <Box component="section" id="Temporal and Time Series Analysis">
              <Typography variant="body1">Temporal and Time Series</Typography>
              <CallVolumeSection />
              <HourlyDistributionSection />
              <DayOfWeekSection />
            </Box>
            <Box component="section" id="Frequency and Categorical Analysis">
              <Typography variant="body1">
                Frequency and Categorical Analysis.
              </Typography>
              <CallerFrequencySection />
              <CountryCodeSection />
            </Box>
            <Box component="section" id="Anomaly and Outlier Detection">
              <Typography variant="body1">
                Anomaly and Outlier Analysis.
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