import React from "react";
import { Box, Paper, Typography, Stack, Grow } from "@mui/material";
import { useDataProvider } from "@refinedev/core";

export const Dashboard = () => {
  const dataProvider = useDataProvider();
  const [stats, setStats] = React.useState({ jobs: 0, applications: 0, success: 0 });

  React.useEffect(() => {
    async function fetchStats() {
      // Fetch jobs count
      const jobsRes = await dataProvider().getList({ resource: "jobs", pagination: { pageSize: 0 } });
      // Fetch applications count
      const appsRes = await dataProvider().getList({ resource: "applications", pagination: { pageSize: 0 } });
      // Fetch success applications
      const successRes = await dataProvider().getList({ resource: "applications", pagination: { pageSize: 0 }, filters: [{ field: "status", operator: "eq", value: "success" }] });
      setStats({
        jobs: jobsRes.total || 0,
        applications: appsRes.total || 0,
        success: successRes.total || 0,
      });
    }
    fetchStats();
  }, [dataProvider]);

  const successRate = stats.applications > 0 ? Math.round((stats.success / stats.applications) * 100) : 0;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>Dashboard</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
        <Grow in timeout={600}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, minWidth: 220 }}>
            <Typography variant="h6">Total Jobs Saved</Typography>
            <Typography variant="h3" color="primary" sx={{ fontWeight: 700 }}>{stats.jobs}</Typography>
          </Paper>
        </Grow>
        <Grow in timeout={800}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, minWidth: 220 }}>
            <Typography variant="h6">Applications Submitted</Typography>
            <Typography variant="h3" color="primary" sx={{ fontWeight: 700 }}>{stats.applications}</Typography>
          </Paper>
        </Grow>
        <Grow in timeout={1000}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 3, minWidth: 220 }}>
            <Typography variant="h6">Success Rate</Typography>
            <Typography variant="h3" color="success.main" sx={{ fontWeight: 700 }}>{successRate}%</Typography>
          </Paper>
        </Grow>
      </Stack>
    </Box>
  );
};
