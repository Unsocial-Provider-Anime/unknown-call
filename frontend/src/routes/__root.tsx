import {
  createRootRouteWithContext,
  Link,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { QueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "../lib/ui/muiTheme";
import CssBaseline from "@mui/material/CssBaseline";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";

interface MyRouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <ThemeProvider theme={theme}>
      <InitColorSchemeScript />
      <CssBaseline />
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
      >
        <Container
          maxWidth="xl"
          sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}
        >
          <Button
            component={Link}
            to="/"
            variant={pathname === "/" ? "contained" : "text"}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            Home
          </Button>
          <Button
            component={Link}
            to="/analysis"
            variant={pathname === "/analysis" ? "contained" : "text"}
            aria-current={pathname === "/analysis" ? "page" : undefined}
          >
            Analysis
          </Button>
        </Container>
      </Box>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </ThemeProvider>
  );
}
