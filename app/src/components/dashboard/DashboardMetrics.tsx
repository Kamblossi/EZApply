import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  CircularProgress,
  LinearProgress,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Work as WorkIcon,
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import io, { Socket } from 'socket.io-client';

interface DashboardMetrics {
  totalJobs: number;
  totalApplications: number;
  successfulApplications: number;
  runningApplications: number;
  successRate: number;
  timestamp: string;
}

const DashboardMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socketInstance = io('http://localhost:3001', {
      withCredentials: true
    });

    setSocket(socketInstance);

    // Authenticate with token
    const token = localStorage.getItem('authToken');
    if (token) {
      socketInstance.emit('authenticate', token);
    }

    // Listen for metrics updates
    socketInstance.on('metrics_update', (data: DashboardMetrics) => {
      setMetrics(data);
      setLastUpdated(new Date());
      setLoading(false);
    });

    socketInstance.on('auth_error', (error) => {
      console.error('Dashboard WebSocket auth error:', error);
      setLoading(false);
    });

    socketInstance.on('connect', () => {
      console.log('Connected to dashboard WebSocket');
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from dashboard WebSocket');
    });

    // Fetch initial metrics via REST API
    fetchMetrics();

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/dashboard/metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (socket) {
      const userId = 'current-user-id'; // Get from auth context
      socket.emit('refresh_metrics', { userId });
    } else {
      fetchMetrics();
    }
  };

  const MetricCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    suffix?: string;
    description?: string;
  }> = ({ title, value, icon, color, suffix = '', description }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        elevation={2}
        sx={{ 
          height: '100%',
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          border: `1px solid ${color}25`,
          '&:hover': {
            transform: 'translateY(-2px)',
            transition: 'transform 0.2s ease-in-out',
            boxShadow: 3
          }
        }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ color, display: 'flex', alignItems: 'center' }}>
                {icon}
              </Box>
              <Typography variant="h6" color="text.secondary" fontWeight="medium">
                {title}
              </Typography>
            </Box>
          </Box>
          
          <Typography 
            variant="h3" 
            fontWeight="bold" 
            color={color}
            mb={description ? 1 : 0}
          >
            {value.toLocaleString()}{suffix}
          </Typography>
          
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading && !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary" mb={2}>
          Unable to load dashboard metrics
        </Typography>
        <Button variant="outlined" onClick={handleRefresh} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Dashboard Overview
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {lastUpdated && (
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Tooltip title="Refresh metrics">
            <IconButton onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Live connection indicator */}
      <Box mb={3}>
        <Chip 
          icon={socket?.connected ? <CheckCircleIcon /> : <CircularProgress size={16} />}
          label={socket?.connected ? 'Live Updates Connected' : 'Connecting...'}
          color={socket?.connected ? 'success' : 'default'}
          variant="outlined"
          size="small"
        />
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Jobs"
            value={metrics.totalJobs}
            icon={<WorkIcon />}
            color="#1976d2"
            description="Available positions"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Applications"
            value={metrics.totalApplications}
            icon={<SendIcon />}
            color="#ed6c02"
            description="Automation runs"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Successful"
            value={metrics.successfulApplications}
            icon={<CheckCircleIcon />}
            color="#2e7d32"
            description="Completed applications"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Success Rate"
            value={metrics.successRate}
            icon={<TrendingUpIcon />}
            color="#9c27b0"
            suffix="%"
            description="Application success rate"
          />
        </Grid>
      </Grid>

      {/* Running Applications */}
      {metrics.runningApplications > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Box mt={3}>
            <Card elevation={1}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <PlayArrowIcon color="primary" />
                  <Typography variant="h6">
                    Active Automations
                  </Typography>
                  <Chip 
                    label={`${metrics.runningApplications} running`}
                    color="primary"
                    size="small"
                  />
                </Box>
                <LinearProgress 
                  variant="indeterminate" 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3
                    }
                  }}
                />
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {metrics.runningApplications} automation{metrics.runningApplications !== 1 ? 's' : ''} currently in progress
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </motion.div>
      )}
    </Box>
  );
};

export default DashboardMetrics;
