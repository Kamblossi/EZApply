// server/src/validators/job.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const JobDTO = z.object({
  id: z.string().uuid().optional().openapi({
    description: 'Unique identifier for the job',
    example: '123e4567-e89b-12d3-a456-426614174007'
  }),
  title: z.string().min(1, 'Job title is required.').openapi({
    description: 'Job title or position name',
    example: 'Senior Staff Nurse - Cardiology'
  }),
  company: z.string().min(1, 'Company name is required.').openapi({
    description: 'Company or organization name',
    example: 'NHS Foundation Trust'
  }),
  location: z.string().optional().nullable().openapi({
    description: 'Job location',
    example: 'London, UK'
  }),
  description: z.string().optional().nullable().openapi({
    description: 'Detailed job description',
    example: 'We are seeking an experienced Senior Staff Nurse to join our Cardiology team...'
  }),
  url: z.string().url('Invalid URL format.').optional().nullable().openapi({
    description: 'Original job posting URL',
    example: 'https://www.jobs.nhs.uk/xi/vacancy/916123456'
  }),
  status: z.string().default('open').openapi({
    description: 'Current status of the job posting',
    example: 'open',
    enum: ['open', 'closed', 'archived']
  }),
  posted_date: z.coerce.date().optional().nullable().openapi({
    description: 'Date when the job was posted',
    example: '2024-01-15'
  }),
  deadline_date: z.coerce.date().optional().nullable().openapi({
    description: 'Application deadline date',
    example: '2024-02-15'
  }),
}).openapi({
  title: 'JobDTO',
  description: 'Job posting information'
});

export type Job = z.infer<typeof JobDTO>;