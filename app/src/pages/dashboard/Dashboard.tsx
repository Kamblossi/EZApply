import { Box, Container } from "@mui/material";
import DashboardMetrics from "../../components/dashboard/DashboardMetrics";

export const Dashboard = () => {
  return (
    <Container maxWidth="xl">
      <Box py={3}>
        <DashboardMetrics />
      </Box>
    </Container>
  );
};
