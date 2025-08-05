import { createTheme } from "@mui/material/styles";

export const ezTheme = createTheme({
  palette: {
    primary: { main: "#00695f" },
    secondary: { main: "#ffc107" },
    mode: "light", // For dark mode toggle, update dynamically
  },
  typography: {
    fontFamily: 'Inter, Roboto, sans-serif',
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
    MuiPaper: {
      defaultProps: { elevation: 1 },
      styleOverrides: { root: { borderRadius: 3 } },
    },
  },
});
