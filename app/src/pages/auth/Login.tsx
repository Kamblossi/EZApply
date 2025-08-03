import { useLogin } from "@refinedev/core";
import { Card, Stack, TextField, Button, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export const Login = () => {
  const { mutate: login } = useLogin();                    // from refine
  return (
    <Card sx={{ maxWidth: 420, m: "auto", mt: 8, p: 3 }}>
      <Typography variant="h4" textAlign="center" mb={3}>
        Login to EZApply
      </Typography>
      
      <Stack gap={2} component="form" onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        login({ 
          email: (form.elements.namedItem('email') as HTMLInputElement).value, 
          password: (form.elements.namedItem('password') as HTMLInputElement).value 
        });
      }}>
        <TextField name="email" label="Email" required />
        <TextField name="password" label="Password" type="password" required />
        <Button type="submit" variant="contained" fullWidth>Login</Button>
        
        <Typography textAlign="center" mt={2}>
          Don't have an account?{" "}
          <Link component={RouterLink} to="/register">
            Register here
          </Link>
        </Typography>
      </Stack>
    </Card>
  );
};
