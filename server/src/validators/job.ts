// server/src/validators/job.ts
import { z } from 'zod';

export const JobDTO = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Job title is required.'),
  company: z.string().min(1, 'Company name is required.'),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  url: z.string().url('Invalid URL format.').optional().nullable(),
  status: z.string().default('open'), // e.g., 'open', 'closed', 'archived'
  posted_date: z.coerce.date().optional().nullable(), // date string from frontend
  deadline_date: z.coerce.date().optional().nullable(), // date string from frontend
});

export type Job = z.infer<typeof JobDTO>;