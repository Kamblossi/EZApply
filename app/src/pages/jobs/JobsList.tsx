import {
  useDataGrid,
} from "@refinedev/mui";
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from "@mui/x-data-grid";
import { Typography, Box, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { 
  Visibility as VisibilityIcon,
  Add as AddIcon
} from "@mui/icons-material";

interface JobData {
  id: string;
  title: string;
  employer: string;
  location: string;
  deadline: string;
}

export const JobsList = () => {
  const navigate = useNavigate();
  const { dataGridProps } = useDataGrid({ resource: "jobs" });

  const handleViewJob = (jobId: string) => {
    // Navigate to applications page with selected job for application wizard
    navigate(`/applications/new?jobId=${jobId}`);
  };

  const handleCreateNewApplication = () => {
    // Navigate to applications page to start new application
    navigate('/applications/new');
  };

  const columns: GridColDef[] = [
    { field: "title", headerName: "Job Title", flex: 1 },
    { field: "employer", headerName: "Employer", flex: 1 },
    { field: "location", headerName: "Location", flex: 0.8 },
    { field: "deadline", headerName: "Deadline", type: "date", width: 140 },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          key="apply"
          icon={<VisibilityIcon />}
          label="Apply for this job"
          onClick={() => handleViewJob(params.id as string)}
        />,
      ],
    },
  ];

  return (
    <Box sx={{ height: '100%' }}>
      {/* Header with Jobs title and New Application button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Jobs
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNewApplication}
          sx={{
            background: 'linear-gradient(45deg, #00b894 30%, #00cec9 90%)',
            '&:hover': {
              background: 'linear-gradient(45deg, #019874 30%, #00b2a9 90%)',
            }
          }}
        >
          New Application
        </Button>
      </Box>
      
      {/* Jobs Table - Full Width */}
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          autoHeight={false}
          density="comfortable"
          disableRowSelectionOnClick={true}
          sx={{
            height: '100%',
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};
