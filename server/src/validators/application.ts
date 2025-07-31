// server/src/validators/application.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const ApplicationDTO = z.object({
  id: z.string().uuid().optional().openapi({
    description: 'Unique identifier for the application',
    example: '123e4567-e89b-12d3-a456-426614174008'
  }),
  user_id: z.string().uuid('Invalid user ID format.').optional().openapi({
    description: 'ID of the user who submitted the application',
    example: '123e4567-e89b-12d3-a456-426614174009'
  }),
  job_id: z.string().uuid('Invalid job ID format.').min(1, 'Job ID is required for an application.').openapi({
    description: 'ID of the job being applied for',
    example: '123e4567-e89b-12d3-a456-426614174007'
  }),
  status: z.string().min(1, 'Application status is required.').default('draft').openapi({
    description: 'Current status of the application',
    example: 'submitted',
    enum: ['draft', 'submitted', 'interview', 'rejected', 'accepted']
  }),
  application_date: z.coerce.date().optional().nullable().openapi({
    description: 'Date when the application was submitted',
    example: '2024-01-20T10:30:00Z'
  }),
  notes: z.string().optional().nullable().openapi({
    description: 'Additional notes or comments about the application',
    example: 'Applied via NHS Jobs portal. Follow up required in 2 weeks.'
  }),
}).openapi({
  title: 'ApplicationDTO',
  description: 'Job application information'
});

export type Application = z.infer<typeof ApplicationDTO>;