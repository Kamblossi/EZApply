import React from "react";
import { Box, Button, Step, StepLabel, Stepper, Typography, Paper } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useNavigate } from "react-router-dom";

const steps = ["Confirm Job Details", "Preview AI Answers", "Run Automation"];

export const ApplicationWizard = () => {
  const [activeStep, setActiveStep] = React.useState(0);
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("jobId");
  const navigate = useNavigate();

  // Placeholder: fetch job details, AI answers, etc.
  // Replace with real API calls as needed
  console.log('Job ID:', jobId); // TODO: Use jobId for actual functionality
  const jobDetails = { title: "Sample Job", employer: "Sample Employer", location: "London", deadline: "2025-08-10" };
  const aiAnswers = ["Why are you interested in this job?", "Describe your relevant experience."];

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  return (
    <Paper elevation={1} sx={{ p: 3, borderRadius: 3, maxWidth: 600, mx: "auto", mt: 4 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <AnimatePresence mode="wait">
        {activeStep === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>Confirm Job Details</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography><b>Title:</b> {jobDetails.title}</Typography>
              <Typography><b>Employer:</b> {jobDetails.employer}</Typography>
              <Typography><b>Location:</b> {jobDetails.location}</Typography>
              <Typography><b>Deadline:</b> {jobDetails.deadline}</Typography>
            </Box>
            <Button variant="contained" onClick={handleNext}>Next</Button>
          </motion.div>
        )}
        {activeStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>Preview AI Answers</Typography>
            <Box sx={{ mb: 2 }}>
              {aiAnswers.map((answer, idx) => (
                <Typography key={idx} sx={{ mb: 1 }}>{answer}</Typography>
              ))}
            </Box>
            <Button variant="contained" onClick={handleNext} sx={{ mr: 2 }}>Next</Button>
            <Button variant="outlined" onClick={handleBack}>Back</Button>
          </motion.div>
        )}
        {activeStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <Typography variant="h6" sx={{ mb: 2 }}>Run Automation</Typography>
            <Typography sx={{ mb: 2 }}>Ready to run Playwright automation for this job application.</Typography>
            <Button variant="contained" color="success" onClick={() => navigate("/applications")}>Run Automation</Button>
            <Button variant="outlined" onClick={handleBack} sx={{ ml: 2 }}>Back</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Paper>
  );
};
