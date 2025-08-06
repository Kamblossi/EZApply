import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';

export const NavigationTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabValue = (pathname: string) => {
    if (pathname === '/' || pathname === '/dashboard') return 0;
    if (pathname.startsWith('/profile')) return 1;
    if (pathname.startsWith('/jobs')) return 2;
    if (pathname.startsWith('/applications')) return 3;
    if (pathname.startsWith('/settings')) return 4;
    return 0;
  };

  const currentTab = getTabValue(location.pathname);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    const routes = ['/', '/profile', '/jobs', '/applications', '/settings'];
    navigate(routes[newValue]);
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        aria-label="Navigation tabs"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          '& .MuiTabs-indicator': {
            backgroundColor: 'primary.main',
            height: 3,
            borderRadius: 1.5,
          }
        }}
      >
        <Tab
          icon={<HomeIcon />}
          label="Home"
          sx={{ textTransform: 'none', minWidth: 120 }}
        />
        <Tab
          icon={<PersonIcon />}
          label="My Profile"
          sx={{ textTransform: 'none', minWidth: 120 }}
        />
        <Tab
          icon={<WorkIcon />}
          label="Jobs"
          sx={{ textTransform: 'none', minWidth: 120 }}
        />
        <Tab
          icon={<DescriptionIcon />}
          label="Applications"
          sx={{ textTransform: 'none', minWidth: 120 }}
        />
        <Tab
          icon={<SettingsIcon />}
          label="Settings"
          sx={{ textTransform: 'none', minWidth: 120 }}
        />
      </Tabs>
    </Box>
  );
};
