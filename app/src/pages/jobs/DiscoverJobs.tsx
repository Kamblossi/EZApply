import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Work as WorkIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

interface DiscoveryPreferences {
  platforms: string[];
  jobTitles: string[];
  locations: string[];
  salaryMin?: number;
  salaryMax?: number;
  contractTypes: string[];
  autoApply: boolean;
}

export const DiscoverJobs = () => {
  const navigate = useNavigate();
  
  const [preferences, setPreferences] = useState<DiscoveryPreferences>({
    platforms: ['nhs-trac'],
    jobTitles: [],
    locations: [],
    contractTypes: ['permanent'],
    autoApply: false
  });
  
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredJobs, setDiscoveredJobs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const availablePlatforms = [
    { id: 'nhs-trac', name: 'NHS Trac', status: 'active' },
    { id: 'nhs-jobs', name: 'NHS Jobs Beta', status: 'coming-soon' },
    { id: 'workday', name: 'Workday', status: 'coming-soon' },
    { id: 'greenhouse', name: 'Greenhouse', status: 'coming-soon' }
  ];

  const handleBack = () => {
    navigate('/jobs');
  };

  const handleStartDiscovery = async () => {
    setIsDiscovering(true);
    setError(null);
    
    try {
      // TODO: Implement actual job discovery API call
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock discovered jobs
      setDiscoveredJobs([
        {
          id: '1',
          title: 'Band 5 Staff Nurse - ICU',
          company: 'NHS Foundation Trust',
          location: 'London, UK',
          platform: 'NHS Trac',
          posted: '2 days ago'
        }
      ]);
      
    } catch (err) {
      setError('Failed to discover jobs. Please try again.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handlePlatformToggle = (platformId: string) => {
    setPreferences(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platformId)
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId]
    }));
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mb: 2 }}
        >
          Back to Jobs
        </Button>
        
        <Typography variant="h4" gutterBottom>
          Discover Jobs
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          Automatically discover and scrape job postings from various job boards based on your preferences.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Discovery Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SettingsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Discovery Settings</Typography>
              </Box>

              {/* Platform Selection */}
              <Typography variant="subtitle2" gutterBottom>
                Job Platforms
              </Typography>
              <List dense sx={{ mb: 3 }}>
                {availablePlatforms.map((platform) => (
                  <ListItem key={platform.id} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Switch
                        checked={preferences.platforms.includes(platform.id)}
                        onChange={() => handlePlatformToggle(platform.id)}
                        disabled={platform.status !== 'active'}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={platform.name}
                      secondary={platform.status === 'active' ? 'Available' : 'Coming Soon'}
                    />
                    {platform.status === 'active' && (
                      <Chip label="Active" color="success" size="small" />
                    )}
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Search Criteria */}
              <Typography variant="subtitle2" gutterBottom>
                Search Criteria
              </Typography>
              
              <TextField
                fullWidth
                label="Job Titles"
                placeholder="e.g., Nurse, Software Engineer, Manager"
                helperText="Comma-separated job titles to search for"
                sx={{ mb: 2 }}
              />
              
              <TextField
                fullWidth
                label="Locations"
                placeholder="e.g., London, Manchester, Remote"
                helperText="Comma-separated locations"
                sx={{ mb: 2 }}
              />

              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Min Salary"
                    placeholder="£25000"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Max Salary"
                    placeholder="£50000"
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Contract Type</InputLabel>
                <Select
                  multiple
                  value={preferences.contractTypes}
                  label="Contract Type"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="permanent">Permanent</MenuItem>
                  <MenuItem value="contract">Contract</MenuItem>
                  <MenuItem value="temporary">Temporary</MenuItem>
                  <MenuItem value="part-time">Part Time</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.autoApply}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      autoApply: e.target.checked
                    }))}
                  />
                }
                label="Auto-apply to matching jobs"
              />

              {/* Start Discovery Button */}
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={isDiscovering ? <CircularProgress size={20} /> : <SearchIcon />}
                onClick={handleStartDiscovery}
                disabled={isDiscovering || preferences.platforms.length === 0}
                sx={{
                  mt: 3,
                  background: 'linear-gradient(45deg, #00b894 30%, #00cec9 90%)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #019874 30%, #00b2a9 90%)',
                  }
                }}
              >
                {isDiscovering ? 'Discovering Jobs...' : 'Start Job Discovery'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Discovery Results */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Discovery Results
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {isDiscovering ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Scanning job boards...
                  </Typography>
                </Box>
              ) : discoveredJobs.length > 0 ? (
                <List>
                  {discoveredJobs.map((job) => (
                    <ListItem key={job.id} divider>
                      <ListItemIcon>
                        <WorkIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={job.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" component="span">
                              {job.company}
                            </Typography>
                            <br />
                            <Typography variant="caption" color="text.secondary">
                              {job.location} • {job.platform} • {job.posted}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Start job discovery to see results here
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
