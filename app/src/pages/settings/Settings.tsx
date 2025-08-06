import React from 'react';
import { Box, Typography, Paper, Switch, FormControlLabel, Divider } from '@mui/material';
import { motion } from 'framer-motion';

export const Settings = () => {
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [autoSave, setAutoSave] = React.useState(true);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Settings
      </Typography>
      
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
    </motion.div>
  );
};
