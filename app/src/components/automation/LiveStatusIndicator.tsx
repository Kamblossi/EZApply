import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  LinearProgress
} from '@mui/material';
import {
  Circle,
  NotificationsActive,
  NotificationsOff,
  PlayArrow,
  CheckCircle,
  Error,
  Schedule,
  Refresh
} from '@mui/icons-material';

interface JobStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface LiveStatusIndicatorProps {
  showBadge?: boolean;
  size?: 'small' | 'medium';
  onJobStatsUpdate?: (stats: JobStats) => void;
}

const LiveStatusIndicator: React.FC<LiveStatusIndicatorProps> = ({
  showBadge = true,
  size = 'medium',
  onJobStatsUpdate
}) => {
  const [stats, setStats] = useState<JobStats>({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (autoRefresh) {
      loadStats(); // Initial load
      interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/stream/automation/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const newStats = data.stats;
        setStats(newStats);
        setIsConnected(true);
        setLastUpdate(new Date());
        
        if (onJobStatsUpdate) {
          onJobStatsUpdate(newStats);
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      setIsConnected(false);
      console.error('Failed to load automation stats:', error);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const getStatusColor = () => {
    if (!isConnected) return 'error';
    if (stats.failed > 0) return 'error';
    if (stats.active > 0) return 'warning';
    if (stats.completed > 0) return 'success';
    return 'default';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (stats.active > 0) return `${stats.active} Running`;
    if (stats.waiting > 0) return `${stats.waiting} Waiting`;
    if (stats.failed > 0) return `${stats.failed} Failed`;
    return 'Idle';
  };

  const getTotalActiveJobs = () => stats.active + stats.waiting;

  const getProgressValue = () => {
    const total = stats.waiting + stats.active + stats.completed + stats.failed;
    if (total === 0) return 0;
    return ((stats.completed + stats.failed) / total) * 100;
  };

  const StatusChip = (
    <Chip
      icon={<Circle />}
      label={getStatusText()}
      color={getStatusColor()}
      size={size}
      variant={stats.active > 0 ? 'filled' : 'outlined'}
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        '& .MuiChip-icon': {
          animation: stats.active > 0 ? 'pulse 1.5s infinite' : 'none'
        },
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 }
        }
      }}
    />
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {showBadge && getTotalActiveJobs() > 0 ? (
        <Badge 
          badgeContent={getTotalActiveJobs()} 
          color="primary"
          max={99}
        >
          {StatusChip}
        </Badge>
      ) : (
        StatusChip
      )}

      {/* Status Details Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { minWidth: 250 }
        }}
      >
        <MenuItem disabled>
          <ListItemIcon>
            <NotificationsActive color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Automation Status"
            secondary={lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString()}` : 'Never updated'}
          />
        </MenuItem>
        
        <Divider />
        
        <MenuItem disabled>
          <ListItemIcon>
            <Schedule />
          </ListItemIcon>
          <ListItemText 
            primary={`${stats.waiting} Waiting`}
            secondary="Jobs in queue"
          />
        </MenuItem>
        
        <MenuItem disabled>
          <ListItemIcon>
            <PlayArrow />
          </ListItemIcon>
          <ListItemText 
            primary={`${stats.active} Running`}
            secondary="Active automations"
          />
        </MenuItem>
        
        <MenuItem disabled>
          <ListItemIcon>
            <CheckCircle />
          </ListItemIcon>
          <ListItemText 
            primary={`${stats.completed} Completed`}
            secondary="Successful runs"
          />
        </MenuItem>
        
        <MenuItem disabled>
          <ListItemIcon>
            <Error />
          </ListItemIcon>
          <ListItemText 
            primary={`${stats.failed} Failed`}
            secondary="Failed attempts"
          />
        </MenuItem>
        
        {(stats.waiting + stats.active + stats.completed + stats.failed) > 0 && (
          <>
            <Divider />
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Overall Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={getProgressValue()}
                sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
              />
              <Typography variant="caption" color="text.secondary">
                {Math.round(getProgressValue())}% Complete
              </Typography>
            </Box>
          </>
        )}
        
        <Divider />
        
        <MenuItem onClick={() => setAutoRefresh(!autoRefresh)}>
          <ListItemIcon>
            {autoRefresh ? <NotificationsActive /> : <NotificationsOff />}
          </ListItemIcon>
          <ListItemText 
            primary={`Auto-refresh ${autoRefresh ? 'On' : 'Off'}`}
            secondary="Toggle automatic updates"
          />
        </MenuItem>
        
        <MenuItem onClick={() => { loadStats(); handleClose(); }}>
          <ListItemIcon>
            <Refresh />
          </ListItemIcon>
          <ListItemText 
            primary="Refresh Now"
            secondary="Get latest status"
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default LiveStatusIndicator;
