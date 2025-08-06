import React from "react";
import { 
  Box, 
  Button, 
  Step, 
  StepLabel, 
  Stepper, 
  Typography, 
  Paper, 
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Chip
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import SmartToyIcon from "@mui/icons-material/SmartToy";

const steps = ["Confirm Job Details", "Preview AI Answers", "Launch Automation"];

interface JobDetails {
  id: string;
  title: string;
  employer: string;
  location: string;
  deadline: string;
  description?: string;
}

interface AIAnswer {
  question: string;
  answer: string;
  confidence: number;
}

export const ApplicationWizard = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [automationStarted, setAutomationStarted] = React.useState(false);
  const [runId, setRunId] = React.useState<string | null>(null);
  
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const navigate = useNavigate();

  // Sample data - replace with actual API calls
  const jobDetails: JobDetails = {
    id: jobId || "sample-job-id",
    title: "Senior Software Engineer",
    employer: "NHS Digital",
    location: "London, UK",
    deadline: "2025-08-20",
    description: "We are looking for a senior software engineer to join our digital transformation team..."
  };

  const aiAnswers: AIAnswer[] = [
    {
      question: "Why are you interested in this role?",
      answer: "I am passionate about using technology to improve healthcare outcomes and believe my experience in full-stack development would contribute significantly to NHS Digital's mission.",
      confidence: 0.92
    },
    {
      question: "Describe your relevant experience.",
      answer: "I have 5+ years of experience developing scalable web applications using React, Node.js, and cloud technologies. Previously worked on healthcare platforms improving patient data management.",
      confidence: 0.88
    },
    {
      question: "What interests you about working for the NHS?",
      answer: "The opportunity to make a meaningful impact on public healthcare while working with cutting-edge technology in a mission-driven organization aligns perfectly with my career goals.",
      confidence: 0.90
    }
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleStartAutomation = async () => {
    if (!jobId) {
      setError("No job ID provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/automation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Adjust based on your auth implementation
        },
        body: JSON.stringify({ jobId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start automation');
      }

      const data = await response.json();
      setRunId(data.runId);
      setAutomationStarted(true);
      
      // Navigate to applications list after a short delay to show success
      setTimeout(() => {
        navigate(`/applications`);
      }, 3000);

    } catch (error) {
      console.error('Error starting automation:', error);
      setError(error instanceof Error ? error.message : 'Failed to start automation');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.8) return 'warning';
    return 'error';
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <Paper elevation={2} sx={{ p: 4, borderRadius: 3, maxWidth: 800, mx: "auto", mt: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, textAlign: 'center' }}>
        Start Job Application
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label, index) => (
          <Step key={label} completed={activeStep > index}>
            <StepLabel
              StepIconComponent={({ active, completed }) => (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: completed 
                      ? 'success.main' 
                      : active 
                      ? 'primary.main' 
                      : 'grey.300',
                    color: completed || active ? 'white' : 'grey.600',
                    fontWeight: 600,
                    fontSize: '14px'
                  }}
                >
                  {completed ? <CheckCircleIcon fontSize="small" /> : index + 1}
                </Box>
              )}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <AnimatePresence mode="wait">
        {activeStep === 0 && (
          <motion.div
            key="step-0"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon color="primary" />
              Confirm Job Details
            </Typography>
            
            <Card elevation={1} sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  {jobDetails.title}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Employer:</strong> {jobDetails.employer}
                </Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <strong>Location:</strong> {jobDetails.location}
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  <strong>Application Deadline:</strong> {new Date(jobDetails.deadline).toLocaleDateString()}
                </Typography>
                {jobDetails.description && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {jobDetails.description}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mb: 3 }}>
              Please verify the job details above before proceeding with the automated application.
            </Alert>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={handleNext} size="large">
                Confirm & Continue
              </Button>
            </Box>
          </motion.div>
        )}

        {activeStep === 1 && (
          <motion.div
            key="step-1"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyIcon color="primary" />
              AI-Generated Application Answers
            </Typography>

            <Alert severity="success" sx={{ mb: 3 }}>
              Our AI has analyzed your profile and generated personalized answers for common application questions.
            </Alert>

            {aiAnswers.map((answer, index) => (
              <Card key={index} elevation={1} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                      {answer.question}
                    </Typography>
                    <Chip
                      label={`${Math.round(answer.confidence * 100)}% confidence`}
                      color={getConfidenceColor(answer.confidence)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {answer.answer}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            <Alert severity="warning" sx={{ mb: 3 }}>
              These answers will be automatically filled in during the application process. You can edit your profile to improve future AI responses.
            </Alert>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={handleBack} size="large">
                Back
              </Button>
              <Button variant="contained" onClick={handleNext} size="large">
                Approve & Continue
              </Button>
            </Box>
          </motion.div>
        )}

        {activeStep === 2 && (
          <motion.div
            key="step-2"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PlayCircleFilledIcon color="primary" />
              Launch Automation
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {automationStarted ? (
              <Card elevation={1} sx={{ mb: 3, bgcolor: 'success.50' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" sx={{ mb: 1, color: 'success.main' }}>
                    Automation Started Successfully!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Run ID: {runId}
                  </Typography>
                  <Typography variant="body2">
                    Your application is being processed automatically. You'll be redirected to the applications page to monitor progress.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Card elevation={1} sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Ready to Launch Automation
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    The automation will:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, mb: 2 }}>
                    <li>Navigate to the NHS Trac application portal</li>
                    <li>Search and locate the specific job posting</li>
                    <li>Fill out the application form with your profile data</li>
                    <li>Use AI-generated answers for essay questions</li>
                    <li>Take screenshots at each step for verification</li>
                    <li>Submit the application on your behalf</li>
                  </Box>
                  <Alert severity="info">
                    This process typically takes 2-5 minutes. You can monitor the progress in real-time from the Applications page.
                  </Alert>
                </CardContent>
              </Card>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                onClick={handleBack} 
                disabled={isLoading || automationStarted}
                size="large"
              >
                Back
              </Button>
              {!automationStarted && (
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={handleStartAutomation}
                  disabled={isLoading}
                  size="large"
                  startIcon={isLoading ? <CircularProgress size={20} /> : <PlayCircleFilledIcon />}
                >
                  {isLoading ? 'Starting...' : 'Launch Automation'}
                </Button>
              )}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Paper>
  );
};
