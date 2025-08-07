import {
  useDataGrid,
} from "@refinedev/mui";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import { Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import ApplicationWizardCard from "../../components/jobs/ApplicationWizardCard";

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
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);

  const handleJobSelect = (job: JobData) => {
    setSelectedJob(job);
  };

  const handleStartWizard = () => {
    if (!selectedJob) {
      // You could show a toast/snackbar here instead
      alert('Please select a job from the table first');
      return;
    }
    // Navigate to application wizard with the selected job
    navigate(`/applications/new?jobId=${selectedJob.id}`);
  };

  const columns: GridColDef[] = [
    { field: "title", headerName: "Job Title", flex: 1 },
    { field: "employer", headerName: "Employer", flex: 1 },
    { field: "location", headerName: "Location", flex: 0.8 },
    { field: "deadline", headerName: "Deadline", type: "date", width: 140 },
  ];

  return (
    <Box sx={{ height: '100%' }}>
      {/* Header with Jobs title and Application Wizard button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Jobs
        </Typography>
        
        <ApplicationWizardCard 
          selectedJob={selectedJob}
          onStartWizard={handleStartWizard}
        />
      </Box>
      
      {/* Jobs Table - Full Width */}
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <DataGrid
          {...dataGridProps}
          columns={columns}
          slots={{ toolbar: GridToolbar }}
          autoHeight={false}
          density="comfortable"
          disableRowSelectionOnClick={false}
          onRowClick={(params) => {
            const jobData: JobData = {
              id: params.row.id,
              title: params.row.title,
              employer: params.row.employer,
              location: params.row.location,
              deadline: params.row.deadline
            };
            handleJobSelect(jobData);
          }}
          sx={{
            height: '100%',
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              '&.Mui-selected': {
                backgroundColor: 'primary.50',
                '&:hover': {
                  backgroundColor: 'primary.100',
                },
              },
            },
          }}
        />
      </Box>
    </Box>
  );
};
