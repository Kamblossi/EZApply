import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const UserDTO = z.object({
  id: z.string().uuid().openapi({
    description: 'Unique identifier for the user',
    example: '123e4567-e89b-12d3-a456-426614174010'
  }),
  email: z.string().email().openapi({
    description: 'User email address',
    example: 'john.smith@example.com'
  }),
  role: z.enum(['user', 'admin']).openapi({
    description: 'User role in the system',
    example: 'user'
  }),
  created_at: z.coerce.date().openapi({
    description: 'Date when the user account was created',
    example: '2024-01-01T10:00:00Z'
  }),
}).openapi({
  title: 'UserDTO',
  description: 'User account information'
});

export type User = z.infer<typeof UserDTO>;
