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
  Divider,
  Chip,
  Alert,
  CircularProgress
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
  const { dataGridProps } = useDataGrid({ 
    resource: "jobs",
    pagination: { pageSize: 20 }
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Extract loading state from dataGridProps
  const isLoading = dataGridProps.loading || false;
  const hasError = !dataGridProps.rows || dataGridProps.rows.length === 0;

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
    { 
      field: "title", 
      headerName: "Job Title", 
      flex: 1,
      minWidth: 200
    },
    { 
      field: "company", 
      headerName: "Company", 
      flex: 1,
      minWidth: 150
    },
    { 
      field: "location", 
      headerName: "Location", 
      flex: 0.8,
      minWidth: 120
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'open'} 
          color={params.value === 'open' ? 'success' : 'default'}
          size="small"
        />
      )
    },
    { 
      field: "deadline_date", 
      headerName: "Deadline", 
      type: "date", 
      width: 140,
      valueGetter: (value) => value ? new Date(value) : null,
      renderCell: (params) => params.value ? new Date(params.value).toLocaleDateString() : '-'
    },
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
          showInMenu
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
      
      {/* Error State */}
      {hasError && !isLoading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No jobs found. Try adding some jobs or adjusting your search criteria.
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Jobs Table - Full Width */}
      {!isLoading && (
        <Box sx={{ height: 'calc(100vh - 200px)' }}>
          <DataGrid
            {...dataGridProps}
            columns={columns}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              },
            }}
            autoHeight={false}
            density="comfortable"
            disableRowSelectionOnClick={true}
            pageSizeOptions={[10, 20, 50]}
            sx={{
              height: '100%',
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              },
              '& .MuiDataGrid-toolbarContainer': {
                borderBottom: '1px solid',
                borderBottomColor: 'divider',
                mb: 1
              }
            }}
          />
        </Box>
      )}
    </Box>
  );
};
