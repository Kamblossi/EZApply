import { createTheme } from "@mui/material/styles";

export const ezTheme = createTheme({
  palette: {
    primary: { main: "#00695f" },
    secondary: { main: "#ffc107" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
  },
});
