import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Switch, 
  FormControlLabel, 
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Chip,
  Stack
} from '@mui/material';
import { motion } from 'framer-motion';
import { useLogout, useGetIdentity } from '@refinedev/core';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';

export const Settings = () => {
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [autoSave, setAutoSave] = React.useState(true);
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false);
  
  const { mutate: logout, isLoading: isLoggingOut } = useLogout();
  const { data: identity, isLoading: isLoadingIdentity } = useGetIdentity();

  const handleLogout = () => {
    logout(
      {},
      {
        onSuccess: () => {
          setLogoutDialogOpen(false);
        },
        onError: (error) => {
          console.error('Logout error:', error);
        },
      }
    );
  };

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>
      
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          Account
        </Typography>
        
        {!isLoadingIdentity && identity ? (
          <Box sx={{ mb: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="body1">
                <strong>Email:</strong> {(identity as any)?.email || 'Not provided'}
              </Typography>
              <Chip 
                label="Authenticated" 
                color="success" 
                size="small" 
                icon={<SecurityIcon />}
              />
            </Stack>
            
            {(identity as any)?.name && (
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Name:</strong> {(identity as any)?.name}
              </Typography>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Logged in and ready to use EZApply
            </Typography>
          </Box>
        ) : null}
        
        {isLoadingIdentity && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Loading account information...
          </Typography>
        )}
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogoutClick}
          disabled={isLoggingOut}
          sx={{ mt: 1 }}
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </Button>
      </Paper>
      
      <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Preferences
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                color="primary"
              />
            }
            label="Dark Mode"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                color="primary"
              />
            }
            label="Enable Notifications"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                color="primary"
              />
            }
            label="Auto-save Profile Changes"
          />
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Application Settings
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          More settings will be added here as the application grows.
        </Typography>
      </Paper>
      
      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
      >
        <DialogTitle id="logout-dialog-title">
          Confirm Logout
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="logout-dialog-description">
            Are you sure you want to logout? You'll need to sign in again to access your profile and applications.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleLogout} 
            color="error" 
            variant="contained"
            disabled={isLoggingOut}
            startIcon={<LogoutIcon />}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};
