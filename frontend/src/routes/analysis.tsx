import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

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
          <Box>
            <Typography variant="body1">
              This is the analysis page content.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
