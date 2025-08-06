import React from "react";
import { List, useDataGrid } from "@refinedev/mui";
import { DataGrid, GridColDef, GridActionsCellItem, GridToolbar } from "@mui/x-data-grid";
import DoneIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import ClockIcon from "@mui/icons-material/Schedule";
import { 
  Chip, 
  Drawer, 
  Typography, 
  Box, 
  Paper,
  IconButton,
  CircularProgress
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from "@mui/lab";
import CloseIcon from "@mui/icons-material/Close";
import { motion, AnimatePresence } from "framer-motion";

interface LogEntry {
  step: number;
  stepType: string;
  message: string;
  screenshot?: string;
  timestamp: string;
}

interface RunLogDrawerProps {
  runId: string | null;
  open: boolean;
  onClose: () => void;
}

const RunLogDrawer: React.FC<RunLogDrawerProps> = ({ runId, open, onClose }) => {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [status, setStatus] = React.useState<string>('pending');
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    if (!runId || !open) {
      setLogs([]);
      setIsConnected(false);
      return;
    }

    // Connect to Server-Sent Events for live log streaming
    const eventSource = new EventSource(`/api/runs/${runId}/stream`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'connected':
            setStatus(data.status);
            break;
          case 'log':
            setLogs(prev => [...prev, {
              step: data.step,
              stepType: data.stepType,
              message: data.message,
              screenshot: data.screenshot,
              timestamp: data.timestamp
            }]);
            break;
          case 'status_change':
            setStatus(data.status);
            break;
          case 'completed':
            setStatus(data.status);
            setIsConnected(false);
            break;
          case 'error':
            console.error('Stream error:', data.message);
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [runId, open]);

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'navigation': return '🔗';
      case 'form_fill': return '📝';
      case 'submit': return '📤';
      case 'screenshot': return '📸';
      case 'error': return '❌';
      case 'validation': return '✅';
      default: return '⚪';
    }
  };

  const getStepColor = (stepType: string) => {
    switch (stepType) {
      case 'error': return 'error';
      case 'validation': return 'success';
      case 'submit': return 'primary';
      case 'screenshot': return 'secondary';
      default: return 'grey';
    }
  };

  return (
    <Drawer 
      anchor="right" 
      open={open} 
      onClose={onClose} 
      sx={{ zIndex: 1300 }}
      PaperProps={{ sx: { width: 500 } }}
    >
      <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Automation Log {runId && `(${runId.slice(-8)})`}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Status:</Typography>
          {statusChip(status)}
          {isConnected && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="primary">Live</Typography>
            </Box>
          )}
        </Box>

        <Paper elevation={1} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
              {isConnected ? 'Waiting for automation to start...' : 'No logs available'}
            </Typography>
          ) : (
            <Timeline sx={{ p: 0 }}>
              <AnimatePresence>
                {logs.map((log, index) => (
                  <motion.div
                    key={`${log.step}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TimelineItem>
                      <TimelineSeparator>
                        <TimelineDot 
                          color={getStepColor(log.stepType)}
                          sx={{ 
                            fontSize: '12px',
                            minHeight: '24px',
                            minWidth: '24px'
                          }}
                        >
                          {getStepIcon(log.stepType)}
                        </TimelineDot>
                        {index < logs.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Step {log.step}: {log.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </Typography>
                        {log.screenshot && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="primary">
                              📸 Screenshot: {log.screenshot}
                            </Typography>
                          </Box>
                        )}
                      </TimelineContent>
                    </TimelineItem>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Timeline>
          )}
        </Paper>
      </Box>
    </Drawer>
  );
};

const statusChip = (status: string) => {
  switch (status) {
    case "success":
      return <Chip icon={<DoneIcon />} label="Success" color="success" size="small" />;
    case "failed":
      return <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />;
    case "running":
      return <Chip icon={<PlayCircleIcon />} label="Running" color="primary" size="small" />;
    case "pending":
      return <Chip icon={<ClockIcon />} label="In Queue" color="default" size="small" />;
    default:
      return <Chip label={status} size="small" />;
  }
};

export const ApplicationsList = () => {
  const { dataGridProps } = useDataGrid({ resource: "applications" });
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);

  const handleViewLog = (runId: string) => {
    setSelectedRunId(runId);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setSelectedRunId(null);
  };

  const columns: GridColDef[] = [
    { field: "jobTitle", headerName: "Job Title", flex: 1 },
    { field: "employer", headerName: "Employer", flex: 0.8 },
    { field: "date", headerName: "Date", type: "date", width: 140 },
    { 
      field: "status", 
      headerName: "Status", 
      width: 140, 
      renderCell: (params: any) => statusChip(params.value),
      sortable: true,
    },
    { field: "runId", headerName: "Run ID", width: 120 },
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
          onClick={() => handleViewLog(params.row.runId)}
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
          initialState={{
            sorting: {
              sortModel: [{ field: 'date', sort: 'desc' }],
            },
          }}
        />
      </List>
      
      <RunLogDrawer
        runId={selectedRunId}
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </>
  );
};
