import React, { useState } from 'react';
import { useRegister } from '@refinedev/core';
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

export const Register = () => {
  const [forename, setForename] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<any>({});

  const { mutate: register, isLoading } = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    register(
      {
        forename,
        surname,
        email,
        password,
      },
      {
        onSuccess: () => {
          console.log('Registration successful');
        },
        onError: (error: any) => {
          console.error('Registration failed:', error);
          setErrors(error?.response?.data?.errors || { general: 'Registration failed' });
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
              Register for EZApply
            </Typography>
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    autoComplete="given-name"
                    name="forename"
                    required
                    fullWidth
                    id="forename"
                    label="First Name"
                    autoFocus
                    value={forename}
                    onChange={(e) => setForename(e.target.value)}
                    error={!!errors.forename}
                    helperText={errors.forename}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    id="surname"
                    label="Last Name"
                    name="surname"
                    autoComplete="family-name"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    error={!!errors.surname}
                    helperText={errors.surname}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    type="email"
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
                    label="Password (min 8 characters)"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    inputProps={{ minLength: 8 }}
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
                {isLoading ? 'Registering...' : 'Register'}
              </Button>

              <Grid container justifyContent="center">
                <Grid item>
                  <MuiLink component={Link} to="/login" variant="body2">
                    Already have an account? Sign in
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
