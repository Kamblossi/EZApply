import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Alert, 
  Paper,
  Link
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLogin } from '@refinedev/core';

interface VerificationState {
  email: string;
}

export const VerifyEmail: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { mutate: login } = useLogin();
  
  const email = (location.state as VerificationState)?.email || '';

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: code.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Use Refine's login with the received token
        login({ token: data.token });
        navigate('/');
      } else {
        setError(data.error || data.message || 'Verification failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setResendMessage('');
    setError('');

    try {
      const response = await fetch('http://localhost:3000/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage('Verification code sent successfully! Check your email.');
      } else {
        setError(data.error || 'Failed to resend verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!email) {
    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          bgcolor: '#f5f5f5'
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
          <Typography variant="h5" gutterBottom>
            Verification Required
          </Typography>
          <Typography color="error" gutterBottom>
            No email provided for verification.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/register')}
            fullWidth
          >
            Go to Registration
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5'
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" gutterBottom align="center">
          Verify Your Email
        </Typography>
        
        <Typography variant="body1" gutterBottom align="center" color="textSecondary">
          We've sent a 6-digit verification code to:
        </Typography>
        
        <Typography variant="body1" gutterBottom align="center" fontWeight="bold">
          {email}
        </Typography>

        <Box component="form" onSubmit={handleVerification} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="Verification Code"
            value={code}
            onChange={(e) => {
              // Only allow numeric input and limit to 6 digits
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(value);
            }}
            placeholder="123456"
            inputProps={{
              maxLength: 6,
              style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }
            }}
            sx={{ mb: 2 }}
            required
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {resendMessage && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {resendMessage}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || code.length !== 6}
            sx={{ mb: 2 }}
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" gutterBottom>
              Didn't receive the code?
            </Typography>
            <Link
              component="button"
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              sx={{ cursor: 'pointer' }}
            >
              {resendLoading ? 'Sending...' : 'Resend verification code'}
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
