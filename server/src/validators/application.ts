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
  status: z.enum(['draft', 'submitted', 'interview', 'rejected', 'accepted']).default('draft').openapi({
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

export const ApplicationTimelineUpdateSchema = z.object({
  job_id: z.string().uuid('Invalid job ID format.').optional().openapi({
    description: 'Updated job ID for the application',
    example: '123e4567-e89b-12d3-a456-426614174007'
  }),
  status: z.enum(['draft', 'submitted', 'interview', 'rejected', 'accepted']).optional().openapi({
    description: 'Updated application status',
    example: 'interview',
    enum: ['draft', 'submitted', 'interview', 'rejected', 'accepted']
  }),
  application_date: z.coerce.date().optional().nullable().openapi({
    description: 'Date when the application was submitted or status changed',
    example: '2024-01-20T10:30:00Z'
  }),
  notes: z.string().optional().nullable().openapi({
    description: 'Timeline notes or comments about this update',
    example: 'Phone interview scheduled for Friday at 2pm'
  }),
  event_type: z.enum(['status_change', 'note_added', 'interview_scheduled', 'follow_up', 'other']).optional().default('status_change').openapi({
    description: 'Type of timeline event',
    example: 'interview_scheduled',
    enum: ['status_change', 'note_added', 'interview_scheduled', 'follow_up', 'other']
  })
}).openapi({
  title: 'ApplicationTimelineUpdateSchema',
  description: 'Schema for timeline-focused application updates'
});

export const TimelineEventSchema = z.object({
  event_type: z.string().openapi({
    description: 'Type of timeline event',
    example: 'status_change'
  }),
  previous_value: z.string().optional().nullable().openapi({
    description: 'Previous value (e.g., previous status)',
    example: 'submitted'
  }),
  new_value: z.string().openapi({
    description: 'New value (e.g., new status)',
    example: 'interview'
  }),
  notes: z.string().optional().nullable().openapi({
    description: 'Notes about this timeline event',
    example: 'Phone interview scheduled for Friday'
  }),
  timestamp: z.coerce.date().openapi({
    description: 'When this event occurred',
    example: '2024-01-20T10:30:00Z'
  }),
  field_changed: z.string().optional().openapi({
    description: 'Which field was changed',
    example: 'status'
  })
}).openapi({
  title: 'TimelineEventSchema',
  description: 'Individual timeline event details'
});

export type Application = z.infer<typeof ApplicationDTO>;
export type ApplicationTimelineUpdate = z.infer<typeof ApplicationTimelineUpdateSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;