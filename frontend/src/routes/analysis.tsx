import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";

export const Route = createFileRoute("/analysis")({
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
                This is the analysis for Temporal and Time Series data.
              </Typography>
              <List>
                <ListItem>Call Volume Trends Over Time</ListItem>
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
