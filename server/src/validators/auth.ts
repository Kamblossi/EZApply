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

export const VerifyEmailDTO = z.object({
  email: z.string().email().openapi({ 
    example: 'alice@example.com',
    description: 'Email address to verify'
  }),
  code: z.string().length(6).openapi({ 
    example: '123456',
    description: '6-digit verification code'
  }),
}).openapi({
  title: 'VerifyEmailDTO',
  description: 'Data required to verify email address'
});

export const ResendVerificationDTO = z.object({
  email: z.string().email().openapi({ 
    example: 'alice@example.com',
    description: 'Email address to resend verification code to'
  }),
}).openapi({
  title: 'ResendVerificationDTO',
  description: 'Data required to resend verification code'
});

export type RegisterUser = z.infer<typeof RegisterUserDTO>;
export type LoginUser = z.infer<typeof LoginUserDTO>;
export type VerifyEmail = z.infer<typeof VerifyEmailDTO>;
export type ResendVerification = z.infer<typeof ResendVerificationDTO>;
export type AuthResponse = z.infer<typeof AuthResponseDTO>;
export type ErrorResponse = z.infer<typeof ErrorResponseDTO>;
