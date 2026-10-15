import { createFileRoute } from "@tanstack/react-router";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Box>
      <Typography variant="h1">Home Page</Typography>
    </Box>
  );
}
