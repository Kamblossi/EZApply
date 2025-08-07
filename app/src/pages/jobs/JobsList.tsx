import {
  useDataGrid,
} from "@refinedev/mui";
import { DataGrid, GridColDef, GridToolbar, GridActionsCellItem } from "@mui/x-data-grid";
import { 
  Typography, 
  Box, 
  Button, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  Divider
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { 
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Add as AddIcon,
  KeyboardArrowDown as ArrowDownIcon
} from "@mui/icons-material";

export const JobsList = () => {
  const navigate = useNavigate();
  const { dataGridProps } = useDataGrid({ resource: "jobs" });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleViewJob = (jobId: string) => {
    // Navigate to applications page with selected job for application wizard
    navigate(`/applications/new?jobId=${jobId}`);
  };

  const handleJobDiscoveryClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddJob = () => {
    handleMenuClose();
    // Navigate to manual job addition form
    navigate('/jobs/add');
  };

  const handleDiscoverJobs = () => {
    handleMenuClose();
    // Navigate to job discovery/scraping interface
    navigate('/jobs/discover');
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
      {/* Header with Jobs title and Job Discovery button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Jobs
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            endIcon={<ArrowDownIcon />}
            onClick={handleJobDiscoveryClick}
            sx={{
              background: 'linear-gradient(45deg, #00b894 30%, #00cec9 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #019874 30%, #00b2a9 90%)',
              }
            }}
          >
            Job Discovery
          </Button>
          
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 200,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                },
              },
            }}
          >
            <MenuItem onClick={handleAddJob}>
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Add Job"
                secondary="Manual job entry"
              />
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleDiscoverJobs}>
              <ListItemIcon>
                <SearchIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Discover Jobs"
                secondary="Automated job scraping"
              />
            </MenuItem>
          </Menu>
        </Box>
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
