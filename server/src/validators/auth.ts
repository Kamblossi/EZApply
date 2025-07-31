import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const RegisterUserDTO = z.object({
  email: z.string().email().openapi({ 
    example: 'alice@example.com',
    description: 'Valid email address for the user account'
  }),
  password: z.string().min(8).openapi({ 
    example: 'S3curePass!',
    description: 'Password must be at least 8 characters long'
  }),
  forename: z.string().min(1).openapi({ 
    example: 'Alice',
    description: 'User\'s first name'
  }),
  surname: z.string().min(1).openapi({ 
    example: 'Johnson',
    description: 'User\'s last name'
  }),
}).openapi({
  title: 'RegisterUserDTO',
  description: 'Data required to register a new user'
});

export const LoginUserDTO = z.object({
  email: z.string().email().openapi({ 
    example: 'alice@example.com',
    description: 'Valid email address for login'
  }),
  password: z.string().min(8).openapi({ 
    example: 'S3curePass!',
    description: 'User\'s password'
  }),
}).openapi({
  title: 'LoginUserDTO',
  description: 'Data required to login'
});

export const AuthResponseDTO = z.object({
  token: z.string().openapi({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT token for authentication'
  })
}).openapi({
  title: 'AuthResponseDTO',
  description: 'Authentication response containing JWT token'
});

export const ErrorResponseDTO = z.object({
  error: z.string().openapi({
    example: 'email exists',
    description: 'Error message describing what went wrong'
  })
}).openapi({
  title: 'ErrorResponseDTO',
  description: 'Error response'
});

export type RegisterUser = z.infer<typeof RegisterUserDTO>;
export type LoginUser = z.infer<typeof LoginUserDTO>;
export type AuthResponse = z.infer<typeof AuthResponseDTO>;
export type ErrorResponse = z.infer<typeof ErrorResponseDTO>;
