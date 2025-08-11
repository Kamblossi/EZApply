import React from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import { JobsList } from './JobsList';
import { AddJob } from './AddJob';
import { DiscoverJobs } from './DiscoverJobs';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`jobs-tabpanel-${index}`}
      aria-labelledby={`jobs-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `jobs-tab-${index}`,
    'aria-controls': `jobs-tabpanel-${index}`,
  };
}

export const JobsMain: React.FC = () => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={value} onChange={handleChange} aria-label="Jobs management tabs">
          <Tab label="My Jobs" {...a11yProps(0)} />
          <Tab label="Add Job" {...a11yProps(1)} />
          <Tab label="Discover Jobs" {...a11yProps(2)} />
        </Tabs>
      </Box>
      
      <TabPanel value={value} index={0}>
        <JobsList />
      </TabPanel>
      
      <TabPanel value={value} index={1}>
        <AddJob />
      </TabPanel>
      
      <TabPanel value={value} index={2}>
        <DiscoverJobs />
      </TabPanel>
    </Box>
  );
};
