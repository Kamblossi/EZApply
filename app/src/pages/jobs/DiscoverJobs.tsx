import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Launch as LaunchIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  AttachMoney as SalaryIcon,
  Schedule as DateIcon
} from '@mui/icons-material';
import { useDataProvider } from '@refinedev/core';

interface JobSearchCriteria {
  keywords: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  radius?: number;
}

interface DiscoveredJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description: string;
  requirements?: string[];
  postedDate?: string;
  deadline?: string;
  platform: string;
  discoveredAt: string;
  isApplied?: boolean;
}

interface SearchResults {
  searchId: string;
  platforms: {
    nhs: {
      success: boolean;
      totalFound: number;
      jobs: DiscoveredJob[];
    };
  };
  totalJobs: number;
  searchCriteria: JobSearchCriteria;
}

export const DiscoverJobs: React.FC = () => {
  const dataProvider = useDataProvider();
  const [searchCriteria, setSearchCriteria] = useState<JobSearchCriteria>({
    keywords: '',
    location: '',
    salaryMin: undefined,
    salaryMax: undefined,
    jobType: '',
    radius: 10
  });
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await dataProvider.create({
        resource: 'jobs/discover',
        variables: searchCriteria
      });
      
      setSearchResults(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to search for jobs');
      console.error('Job search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveJob = async (job: DiscoveredJob, createApplication = false) => {
    try {
      await dataProvider.create({
        resource: 'jobs/discover/save',
        variables: {
          externalId: job.id,
          platform: job.platform,
          createApplication
        }
      });
      
      setSavedJobs(prev => new Set(prev).add(job.id));
      
      // Show success message
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save job');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const formatSalary = (salary?: string) => {
    return salary || 'Salary not specified';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Discover Jobs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Search for jobs across multiple platforms and save them to your job list.
      </Typography>

      {/* Search Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Search Criteria
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Keywords"
              value={searchCriteria.keywords}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, keywords: e.target.value }))}
              placeholder="e.g., Nurse, Healthcare Assistant"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Location"
              value={searchCriteria.location}
              onChange={(e) => setSearchCriteria(prev => ({ ...prev, location: e.target.value }))}
              placeholder="e.g., London, Manchester"
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Minimum Salary (£)"
              type="number"
              value={searchCriteria.salaryMin || ''}
              onChange={(e) => setSearchCriteria(prev => ({ 
                ...prev, 
                salaryMin: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Maximum Salary (£)"
              type="number"
              value={searchCriteria.salaryMax || ''}
              onChange={(e) => setSearchCriteria(prev => ({ 
                ...prev, 
                salaryMax: e.target.value ? parseInt(e.target.value) : undefined 
              }))}
            />
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Job Type</InputLabel>
              <Select
                value={searchCriteria.jobType || ''}
                label="Job Type"
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, jobType: e.target.value }))}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="permanent">Permanent</MenuItem>
                <MenuItem value="temporary">Temporary</MenuItem>
                <MenuItem value="bank">Bank</MenuItem>
                <MenuItem value="apprenticeship">Apprenticeship</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              startIcon={isLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              onClick={handleSearch}
              disabled={isLoading || !searchCriteria.keywords}
              size="large"
            >
              {isLoading ? 'Searching...' : 'Search Jobs'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Search Results */}
      {searchResults && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Search Results
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Found {searchResults.totalJobs} jobs from NHS Trac
          </Typography>

          {/* NHS Results */}
          {searchResults.platforms.nhs.success && searchResults.platforms.nhs.jobs.length > 0 ? (
            <Grid container spacing={2}>
              {searchResults.platforms.nhs.jobs.map((job) => (
                <Grid item xs={12} key={job.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" component="h3">
                            {job.title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <BusinessIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {job.company}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                {job.location}
                              </Typography>
                            </Box>
                            {job.salary && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <SalaryIcon fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {formatSalary(job.salary)}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <Chip 
                          label="NHS" 
                          color="primary" 
                          size="small" 
                          sx={{ ml: 2 }}
                        />
                      </Box>

                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="body2">View Details</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {job.description}
                            </Typography>
                            
                            {job.requirements && job.requirements.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  Requirements:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                  {job.requirements.map((req, index) => (
                                    <Chip key={index} label={req} size="small" variant="outlined" />
                                  ))}
                                </Box>
                              </Box>
                            )}
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Grid container spacing={2}>
                              <Grid item xs={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <DateIcon fontSize="small" color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    Posted: {formatDate(job.postedDate)}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <DateIcon fontSize="small" color="action" />
                                  <Typography variant="body2" color="text.secondary">
                                    Deadline: {formatDate(job.deadline)}
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>
                          </Box>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                    
                    <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                      <Box>
                        <Tooltip title="Save to My Jobs">
                          <IconButton
                            onClick={() => handleSaveJob(job, false)}
                            disabled={savedJobs.has(job.id)}
                            color="primary"
                          >
                            {savedJobs.has(job.id) ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                          </IconButton>
                        </Tooltip>
                        <Button
                          variant="outlined"
                          onClick={() => handleSaveJob(job, true)}
                          disabled={savedJobs.has(job.id)}
                          sx={{ ml: 1 }}
                        >
                          Save & Apply
                        </Button>
                      </Box>
                      
                      <Button
                        variant="contained"
                        endIcon={<LaunchIcon />}
                        component={Link}
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View Job
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              No jobs found matching your search criteria. Try adjusting your keywords or location.
            </Alert>
          )}
        </Box>
      )}

      {/* Help Section */}
      {!searchResults && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            Getting Started
          </Typography>
          <Typography variant="body2" color="text.secondary">
            1. Enter keywords related to the job you're looking for (e.g., "Nurse", "Healthcare Assistant")
            <br />
            2. Specify a location or leave blank to search all locations
            <br />
            3. Optionally set salary ranges and job type preferences
            <br />
            4. Click "Search Jobs" to discover opportunities from NHS Trac
            <br />
            5. Save interesting jobs to your personal job list or create applications directly
          </Typography>
        </Paper>
      )}
    </Box>
  );
};
