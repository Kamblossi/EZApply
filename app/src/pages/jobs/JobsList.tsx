import {
  List, useDataGrid,
} from "@refinedev/mui";
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import { Typography } from "@mui/material";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { useNavigate } from "react-router-dom";

export const JobsList = () => {
  const navigate = useNavigate();
  const { dataGridProps } = useDataGrid({ resource: "jobs" });

  const columns: GridColDef[] = [
    { field: "title", headerName: "Job Title", flex: 1 },
    { field: "employer", headerName: "Employer", flex: 1 },
    { field: "location", headerName: "Location", flex: 0.8 },
    { field: "deadline", headerName: "Deadline", type: "date", width: 140 },
    {
      type: "actions" as const,
      field: "actions",
      headerName: "Actions",
      width: 160,
      getActions: (params: any) => [
        <GridActionsCellItem
          key="start"
          icon={<PlayCircleIcon color="primary" />}
          label="Start Application"
          onClick={() => navigate(`/applications/new?jobId=${params.id}`)}
        />,
      ],
    },
  ];

  return (
    <List title={<Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Jobs</Typography>}>
      <DataGrid
        {...dataGridProps}
        columns={columns}
        slots={{ toolbar: GridToolbar }}
        autoHeight
        density="comfortable"
        disableRowSelectionOnClick
      />
    </List>
  );
};
