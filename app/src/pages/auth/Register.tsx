import { useRegister } from "@refinedev/core";
import { Card, Stack, TextField, Button, Typography, Link } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export const Register = () => {
  const { mutate: register } = useRegister();
  
  return (
    <Card sx={{ maxWidth: 420, m: "auto", mt: 8, p: 3 }}>
      <Typography variant="h4" textAlign="center" mb={3}>
        Register for EZApply
      </Typography>
      
      <Stack gap={2} component="form" onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        register({ 
          email: (form.elements.namedItem('email') as HTMLInputElement).value, 
          password: (form.elements.namedItem('password') as HTMLInputElement).value,
          name: (form.elements.namedItem('name') as HTMLInputElement).value
        });
      }}>
        <TextField name="name" label="Full Name" required />
        <TextField name="email" label="Email" required />
        <TextField name="password" label="Password" type="password" required />
        <Button type="submit" variant="contained" fullWidth>Register</Button>
        
        <Typography textAlign="center" mt={2}>
          Already have an account?{" "}
          <Link component={RouterLink} to="/login">
            Login here
          </Link>
        </Typography>
      </Stack>
    </Card>
  );
};
