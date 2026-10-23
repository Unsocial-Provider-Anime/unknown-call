import { createFileRoute } from '@tanstack/react-router'
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export const Route = createFileRoute('/about')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Box
      component="main"
      sx={{ minHeight: "100vh", bgcolor: "background.default" }}
    >
      <Container maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="h4" component="h1">
            About
          </Typography>
          <Typography>
            Unknown calls are common in Hong Kong. I began keeping a
            record of the date, time, and phone number for each one I receive.
            This website analyzes those records to reveal patterns and trends
            over time.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
