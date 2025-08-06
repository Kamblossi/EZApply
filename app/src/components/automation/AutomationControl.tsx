import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Drawer,
  IconButton,
  Divider,
  Grid,
  Avatar,
  CircularProgress
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  Close,
  ViewList,
  CheckCircle,
  Error,
  Schedule,
  PlayCircleOutline
} from '@mui/icons-material';

interface AutomationJob {
  id: string;
  progress: number;
  processedOn?: string;
  finishedOn?: string;
  failedReason?: string;
  data: {
    jobData: {
      jobTitle: string;
      companyName: string;
      applicationId?: string;
    };
  };
  returnvalue?: any;
}

interface AutomationEvent {
  type: 'connected' | 'status' | 'log' | 'progress' | 'completed' | 'error' | 'event';
  jobId: string;
  timestamp: string;
  message?: string;
  data?: any;
}

const AutomationControl: React.FC = () => {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [activeJob, setActiveJob] = useState<AutomationJob | null>(null);
  const [eventLogs, setEventLogs] = useState<AutomationEvent[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state for new automation
  const [formData, setFormData] = useState({
    jobTitle: 'Software Developer',
    companyName: 'NHS',
    applicationId: ''
  });

  // Server-Sent Events connection
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    loadJobStats();
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  const loadJobStats = async () => {
    try {
      const response = await fetch('/api/stream/automation/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs([
          ...data.jobs.active,
          ...data.jobs.completed.slice(0, 5), // Show last 5 completed
          ...data.jobs.failed.slice(0, 3) // Show last 3 failed
        ]);
      }
    } catch (err) {
      console.error('Failed to load job stats:', err);
    }
  };

  const startAutomation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/stream/automation/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        setIsDialogOpen(false);
        
        // Start listening to job events
        connectToJobStream(result.jobId);
        
        // Reload stats
        await loadJobStats();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start automation');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const connectToJobStream = (jobId: string) => {
    if (eventSource) {
      eventSource.close();
    }

    const newEventSource = new EventSource(
      `/api/stream/automation/${jobId}/stream`,
      {
        // Note: EventSource doesn't support custom headers directly
        // The server should handle auth via cookies or query params for SSE
      }
    );

    newEventSource.onmessage = (event) => {
      try {
        const eventData: AutomationEvent = JSON.parse(event.data);
        setEventLogs(prev => [...prev, eventData]);
        
        // Update active job if this is a progress update
        if (eventData.type === 'progress' || eventData.type === 'status') {
          setActiveJob(prev => prev?.id === jobId ? {
            ...prev,
            ...eventData.data
          } : prev);
        }
        
        // Close connection when job completes
        if (eventData.type === 'completed') {
          newEventSource.close();
          loadJobStats(); // Refresh the job list
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    newEventSource.onerror = (event) => {
      console.error('SSE connection error:', event);
      setError('Connection to automation stream lost');
    };

    setEventSource(newEventSource);
  };

  const getJobStatus = (job: AutomationJob) => {
    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'running';
    return 'waiting';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'primary';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle />;
      case 'running': return <PlayCircleOutline />;
      case 'failed': return <Error />;
      default: return <Schedule />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Automation Control Center
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Control Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          onClick={() => setIsDialogOpen(true)}
          disabled={loading}
        >
          Start New Automation
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadJobStats}
        >
          Refresh Status
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<ViewList />}
          onClick={() => setIsLogDrawerOpen(true)}
        >
          View Logs ({eventLogs.length})
        </Button>
      </Box>

      {/* Active Job Progress */}
      {activeJob && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2 }}>
                {getStatusIcon(getJobStatus(activeJob))}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  Active Automation: {activeJob.data.jobData.jobTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Company: {activeJob.data.jobData.companyName} | Job ID: {activeJob.id}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress: {activeJob.progress || 0}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={activeJob.progress || 0} 
              sx={{ height: 8, borderRadius: 4 }}
            />
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <Grid container spacing={2}>
        {jobs.map((job) => {
          const status = getJobStatus(job);
          return (
            <Grid item xs={12} md={6} lg={4} key={job.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' }
                }}
                onClick={() => {
                  setActiveJob(job);
                  if (status === 'running') {
                    connectToJobStream(job.id);
                  }
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Chip
                      icon={getStatusIcon(status)}
                      label={status.toUpperCase()}
                      color={getStatusColor(status)}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {job.id.slice(-8)}
                    </Typography>
                  </Box>
                  
                  <Typography variant="h6" noWrap>
                    {job.data.jobData.jobTitle}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {job.data.jobData.companyName}
                  </Typography>
                  
                  {status === 'running' && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={job.progress || 0}
                        sx={{ height: 4, borderRadius: 2 }}
                      />
                    </Box>
                  )}
                  
                  {job.finishedOn && (
                    <Typography variant="caption" color="text.secondary">
                      Completed: {new Date(job.finishedOn).toLocaleString()}
                    </Typography>
                  )}
                  
                  {job.failedReason && (
                    <Typography variant="caption" color="error">
                      Error: {job.failedReason}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Start Automation Dialog */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Automation</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Job Title"
              value={formData.jobTitle}
              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Company Name"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Application ID (Optional)"
              value={formData.applicationId}
              onChange={(e) => setFormData({ ...formData, applicationId: e.target.value })}
              helperText="Link this automation to an existing application"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={startAutomation} 
            variant="contained"
            disabled={loading || !formData.jobTitle || !formData.companyName}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
          >
            {loading ? 'Starting...' : 'Start Automation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Logs Drawer */}
      <Drawer
        anchor="right"
        open={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        PaperProps={{ sx: { width: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">Automation Logs</Typography>
            <IconButton onClick={() => setIsLogDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <List dense>
            {eventLogs.slice().reverse().map((log, index) => (
              <ListItem key={index} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={log.type} 
                        size="small" 
                        color={log.type === 'error' ? 'error' : 'default'}
                      />
                      <Typography variant="caption">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  }
                  secondary={log.message || JSON.stringify(log.data, null, 2)}
                />
              </ListItem>
            ))}
          </List>
          
          {eventLogs.length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center">
              No logs available
            </Typography>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default AutomationControl;
