import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useCreate } from '@refinedev/core';

interface JobFormData {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
}

export const AddJob = () => {
  const navigate = useNavigate();
  const { mutate: createJob, isLoading } = useCreate();
  
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    company: '',
    location: '',
    url: '',
    description: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (field: keyof JobFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Basic validation
    if (!formData.title || !formData.company) {
      setError('Job title and company are required');
      return;
    }

    try {
      createJob(
        {
          resource: 'jobs',
          values: {
            title: formData.title,
            company: formData.company,
            location: formData.location,
            url: formData.url,
            description: formData.description,
            status: 'draft'
          }
        },
        {
          onSuccess: () => {
            setSuccess('Job added successfully!');
            setTimeout(() => {
              navigate('/jobs');
            }, 2000);
          },
          onError: (error: any) => {
            setError(error?.message || 'Failed to add job');
          }
        }
      );
    } catch (err) {
      setError('An unexpected error occurred');
    }
  };

  const handleBack = () => {
    navigate('/jobs');
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
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
          Add New Job
        </Typography>
        
        <Typography variant="body1" color="text.secondary">
          Manually add a job posting to your tracker. You can paste a job URL to auto-fill some details.
        </Typography>
      </Box>

      {/* Alert Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Job Form */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Job URL */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Job URL"
                  placeholder="https://example.com/job-posting"
                  value={formData.url}
                  onChange={handleInputChange('url')}
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  helperText="Paste the job posting URL to auto-fill details (feature coming soon)"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Job Details
                  </Typography>
                </Divider>
              </Grid>

              {/* Job Title */}
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  required
                  label="Job Title"
                  placeholder="e.g., Senior Software Engineer"
                  value={formData.title}
                  onChange={handleInputChange('title')}
                />
              </Grid>

              {/* Company */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  label="Company"
                  placeholder="e.g., TechCorp Ltd"
                  value={formData.company}
                  onChange={handleInputChange('company')}
                />
              </Grid>

              {/* Location */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Location"
                  placeholder="e.g., London, UK"
                  value={formData.location}
                  onChange={handleInputChange('location')}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Job Description"
                  placeholder="Paste or type the job description here..."
                  value={formData.description}
                  onChange={handleInputChange('description')}
                />
              </Grid>

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                    disabled={isLoading}
                    sx={{
                      background: 'linear-gradient(45deg, #00b894 30%, #00cec9 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #019874 30%, #00b2a9 90%)',
                      }
                    }}
                  >
                    {isLoading ? 'Adding Job...' : 'Add Job'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};
