import React, { useState } from 'react';
import {
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  RocketLaunch as RocketLaunchIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlowButton } from '../ui';

interface JobData {
  id: string;
  title: string;
  employer: string;
  location: string;
  deadline: string;
}

interface ApplicationWizardCardProps {
  selectedJob?: JobData | null;
  onStartWizard?: () => void;
}

const ApplicationWizardCard: React.FC<ApplicationWizardCardProps> = ({ 
  selectedJob,
  onStartWizard
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  const steps = ['Select Job', 'Review AI Answers', 'Launch Automation'];

  const features = [
    {
      icon: <AutoAwesomeIcon />,
      title: 'AI-Powered Answers',
      description: 'Automatically generate tailored responses to application questions'
    },
    {
      icon: <SpeedIcon />,
      title: 'Lightning Fast',
      description: 'Complete applications in 2-5 minutes instead of hours'
    },
    {
      icon: <SecurityIcon />,
      title: 'Secure & Local',
      description: 'All data stays on your machine, full privacy guaranteed'
    },
    {
      icon: <VisibilityIcon />,
      title: 'Full Transparency',
      description: 'Watch every step with screenshots and real-time logs'
    }
  ];

  const handleStartWizard = () => {
    if (!selectedJob) {
      // Show dialog anyway, but display error in the dialog
      setError('Please select a job from the table below first');
      setDialogOpen(true);
      setCurrentStep(0);
      return;
    }
    setError(null);
    setDialogOpen(true);
    setCurrentStep(0);
    onStartWizard?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStartAutomation = async () => {
    if (!selectedJob) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/automation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ez-token')}`
        },
        body: JSON.stringify({ jobId: selectedJob.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start automation');
      }

      const result = await response.json();
      console.log('Automation started:', result);
      setDialogOpen(false);
      
      // Navigate to applications page to view progress
      navigate(`/applications`);

    } catch (error) {
      console.error('Error starting automation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start automation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <GlowButton
          onClick={handleStartWizard}
          disabled={isLoading}
          glowStartColor="#00b894"
          glowEndColor="#00cec9"
          backgroundColor={theme.palette.mode === 'dark' ? '#0d4f47' : '#186b63'}
          textColor="#ffffff"
        >
          {isLoading ? 'Starting...' : 'Apply'}
        </GlowButton>
      </motion.div>

      {/* Wizard Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Application Wizard
          </Typography>
          <IconButton onClick={() => setDialogOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stepper activeStep={currentStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {error ? (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{ mb: 3 }}>
                    Confirm your job selection and review the automation process.
                  </Alert>
                )}
                
                <List>
                  {features.map((feature, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        {feature.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={feature.title}
                        secondary={feature.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Alert severity="success" sx={{ mb: 3 }}>
                  AI has generated personalized answers based on your profile.
                </Alert>
                
                <Typography variant="body2" color="text.secondary">
                  The system will automatically:
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText primary="• Fill personal details from your profile" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Generate tailored answers to essay questions" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Handle file uploads and form validation" />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="• Provide real-time progress updates" />
                  </ListItem>
                </List>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                
                <Alert severity="warning" sx={{ mb: 3 }}>
                  The automation will start immediately. Make sure your NHS Trac login credentials are ready.
                </Alert>
                
                <Typography variant="body2" color="text.secondary">
                  Estimated completion time: 2-5 minutes
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          
          {currentStep > 0 && (
            <Button 
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </Button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button 
              variant="contained" 
              onClick={handleNext}
              disabled={isLoading || (currentStep === 0 && !selectedJob)}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleStartAutomation}
              disabled={isLoading || !selectedJob}
              startIcon={isLoading ? <CircularProgress size={20} /> : <RocketLaunchIcon />}
            >
              {isLoading ? 'Starting...' : 'Launch Automation'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApplicationWizardCard;
