import { createTheme, responsiveFontSizes } from "@mui/material/styles";

const baseTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "class",
  },
});

export const theme = responsiveFontSizes(baseTheme);
