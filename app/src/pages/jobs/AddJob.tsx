import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
  Divider,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AutoFixHigh as AutoFixIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useCreate } from '@refinedev/core';
import { SupportedJobSites } from '../../components/jobs/SupportedJobSites';

interface JobFormData {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
}

interface ParsedJobData {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  salary?: string;
  deadline?: string;
  requirements?: string[];
  success: boolean;
  error?: string;
  source?: string;
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
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParsedJobData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // URL validation helper
  const validateUrl = (url: string): 'valid' | 'invalid' | 'empty' => {
    if (!url.trim()) return 'empty';
    try {
      new URL(url);
      return 'valid';
    } catch {
      return 'invalid';
    }
  };

  const getUrlEndAdornment = () => {
    const status = validateUrl(formData.url);
    if (status === 'empty') return null;
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
        {status === 'valid' ? (
          <CheckIcon sx={{ color: 'success.main', fontSize: 20 }} />
        ) : (
          <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
        )}
      </Box>
    );
  };

  const handleInputChange = (field: keyof JobFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleDescriptionChange = (content: string) => {
    setFormData(prev => ({
      ...prev,
      description: content
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.title.trim()) {
      errors.title = 'Job title is required';
    }
    
    if (!formData.company.trim()) {
      errors.company = 'Company name is required';
    }

    // URL validation (if provided)
    if (formData.url.trim()) {
      try {
        new URL(formData.url);
      } catch {
        errors.url = 'Please enter a valid URL';
      }
    }

    // Description validation (check if it's not just empty HTML)
    const strippedDescription = formData.description.replace(/<[^>]*>/g, '').trim();
    if (strippedDescription.length < 10) {
      errors.description = 'Please provide a more detailed job description (at least 10 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUrlParse = async () => {
    if (!formData.url) {
      setError('Please enter a job URL first');
      return;
    }

    setIsParsing(true);
    setError(null);
    setParseResult(null);

    try {
      const response = await fetch('http://localhost:4000/api/jobs/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ez-token')}`
        },
        body: JSON.stringify({ url: formData.url })
      });

      const data: ParsedJobData = await response.json();
      setParseResult(data);

      if (data.success) {
        // Auto-fill form with parsed data
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          company: data.company || prev.company,
          location: data.location || prev.location,
          description: data.description || prev.description
        }));
        
        setSuccess(`Successfully parsed job from ${data.source || 'job site'}!`);
      } else {
        setError(data.error || 'Failed to parse job URL');
      }
    } catch (err) {
      setError('Network error while parsing URL. Please try again.');
      console.error('URL parsing error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate form
    if (!validateForm()) {
      setError('Please fix the validation errors below');
      return;
    }

    try {
      createJob(
        {
          resource: 'jobs',
          values: {
            title: formData.title.trim(),
            company: formData.company.trim(),
            location: formData.location.trim() || null,
            url: formData.url.trim() || null,
            description: formData.description.trim(),
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
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth
                    label="Job URL"
                    placeholder="https://example.com/job-posting"
                    value={formData.url}
                    onChange={handleInputChange('url')}
                    error={!!validationErrors.url}
                    helperText={validationErrors.url || "Paste the job posting URL to auto-fill details"}
                    InputProps={{
                      startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                      endAdornment: getUrlEndAdornment()
                    }}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleUrlParse}
                    disabled={!formData.url || isParsing}
                    sx={{ 
                      mt: 1, 
                      minWidth: '140px',
                      height: '48px'
                    }}
                    startIcon={isParsing ? <CircularProgress size={16} /> : <AutoFixIcon />}
                  >
                    {isParsing ? 'Parsing...' : 'Auto-Fill'}
                  </Button>
                </Box>
                
                {/* Supported Sites Information */}
                <SupportedJobSites />
                
                {/* Parse Result Indicator */}
                {parseResult && (
                  <Box sx={{ mt: 1 }}>
                    {parseResult.success ? (
                      <Chip 
                        icon={<CheckCircleIcon />}
                        label={`Parsed from ${parseResult.source}`}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip 
                        icon={<ErrorIcon />}
                        label="Parsing failed"
                        color="error"
                        size="small"
                      />
                    )}
                  </Box>
                )}
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
                  error={!!validationErrors.title}
                  helperText={validationErrors.title}
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
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Job Description
                </Typography>
                <Box sx={{ 
                  border: '1px solid', 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  '& .ql-editor': {
                    minHeight: '120px'
                  }
                }}>
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    placeholder="Paste or type the job description here..."
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        [{'list': 'ordered'}, {'list': 'bullet'}],
                        ['clean']
                      ],
                    }}
                  />
                </Box>
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
