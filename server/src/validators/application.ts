// server/src/validators/application.ts
import { z } from 'zod';

export const ApplicationDTO = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid('Invalid user ID format.').optional(), // Will be populated by backend
  job_id: z.string().uuid('Invalid job ID format.').min(1, 'Job ID is required for an application.'),
  status: z.string().min(1, 'Application status is required.').default('draft'), // e.g., 'draft', 'submitted', 'interview', 'rejected', 'accepted'
  application_date: z.coerce.date().optional().nullable(), // Defaults to NOW() in DB, but can be provided
  notes: z.string().optional().nullable(),
});

export type Application = z.infer<typeof ApplicationDTO>;