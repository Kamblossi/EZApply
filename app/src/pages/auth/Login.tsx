import React, { useState } from 'react';
import { useLogin } from '@refinedev/core';
import { Link } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Grid,
  Link as MuiLink,
} from '@mui/material';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});

  const { mutate: login, isLoading } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    login(
      {
        email,
        password,
      },
      {
        onSuccess: () => {
          console.log('Login successful');
        },
        onError: (error: any) => {
          console.error('Login failed:', error);
          setErrors(error?.response?.data?.errors || { general: 'Login failed' });
        },
      }
    );
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Card sx={{ width: '100%', mt: 1 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              Login to EZApply
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    type="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={!!errors.password}
                    helperText={errors.password}
                  />
                </Grid>
              </Grid>

              {errors.general && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {errors.general}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading}
                sx={{ mt: 3, mb: 2 }}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              <Grid container justifyContent="center">
                <Grid item>
                  <MuiLink component={Link} to="/register" variant="body2">
                    Don't have an account? Register here
                  </MuiLink>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};
