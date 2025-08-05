import React from "react";
import { List, useDataGrid } from "@refinedev/mui";
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import DoneIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Chip, Drawer, List as MuiList, ListItem, Typography, Box } from "@mui/material";

const statusChip = (status: string) => {
  switch (status) {
    case "success":
      return <Chip icon={<DoneIcon />} label="Success" color="success" />;
    case "failed":
      return <Chip icon={<ErrorIcon />} label="Failed" color="error" />;
    default:
      return <Chip label={status} />;
  }
};

export const ApplicationsList = () => {
  const { dataGridProps } = useDataGrid({ resource: "applications" });
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [logLines, setLogLines] = React.useState<string[]>([]);

  const handleViewLog = async (id: string) => {
    // TODO: Fetch log from /runs/{id} and stream JSON lines
    console.log('Viewing log for:', id); // Temporary to avoid unused parameter warning
    setLogLines(["2025-08-05T12:00:00Z success Application started", "2025-08-05T12:00:01Z info Step 1 completed"]);
    setDrawerOpen(true);
  };

  const columns: GridColDef[] = [
    { field: "jobTitle", headerName: "Job Title", flex: 1 },
    { field: "date", headerName: "Date", type: "date", width: 140 },
    { field: "status", headerName: "Status", width: 140, renderCell: (params: any) => statusChip(params.value) },
    {
      type: "actions" as const,
      field: "actions",
      headerName: "Actions",
      width: 120,
      getActions: (params: any) => [
        <GridActionsCellItem
          key="view-log"
          icon={<VisibilityIcon />}
          label="View Log"
          onClick={() => handleViewLog(params.id)}
        />,
      ],
    },
  ];

  return (
    <>
      <List title={<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Applications</Typography>}>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          autoHeight
          density="comfortable"
          disableRowSelectionOnClick
        />
      </List>
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ zIndex: 1300 }}>
        <Box sx={{ width: 400, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Automation Log</Typography>
          <MuiList>
            {logLines.map((line, idx) => (
              <ListItem key={idx}>
                <Typography variant="body2">{line}</Typography>
              </ListItem>
            ))}
          </MuiList>
        </Box>
      </Drawer>
    </>
  );
};
