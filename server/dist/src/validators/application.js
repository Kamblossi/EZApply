"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelineEventSchema = exports.ApplicationTimelineUpdateSchema = exports.ApplicationDTO = void 0;
// server/src/validators/application.ts
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.ApplicationDTO = zod_1.z.object({
    id: zod_1.z.string().uuid().optional().openapi({
        description: 'Unique identifier for the application',
        example: '123e4567-e89b-12d3-a456-426614174008'
    }),
    user_id: zod_1.z.string().uuid('Invalid user ID format.').optional().openapi({
        description: 'ID of the user who submitted the application',
        example: '123e4567-e89b-12d3-a456-426614174009'
    }),
    job_id: zod_1.z.string().uuid('Invalid job ID format.').min(1, 'Job ID is required for an application.').openapi({
        description: 'ID of the job being applied for',
        example: '123e4567-e89b-12d3-a456-426614174007'
    }),
    status: zod_1.z.enum(['draft', 'submitted', 'interview', 'rejected', 'accepted']).default('draft').openapi({
        description: 'Current status of the application',
        example: 'submitted',
        enum: ['draft', 'submitted', 'interview', 'rejected', 'accepted']
    }),
    application_date: zod_1.z.coerce.date().optional().nullable().openapi({
        description: 'Date when the application was submitted',
        example: '2024-01-20T10:30:00Z'
    }),
    notes: zod_1.z.string().optional().nullable().openapi({
        description: 'Additional notes or comments about the application',
        example: 'Applied via NHS Jobs portal. Follow up required in 2 weeks.'
    }),
}).openapi({
    title: 'ApplicationDTO',
    description: 'Job application information'
});
exports.ApplicationTimelineUpdateSchema = zod_1.z.object({
    job_id: zod_1.z.string().uuid('Invalid job ID format.').optional().openapi({
        description: 'Updated job ID for the application',
        example: '123e4567-e89b-12d3-a456-426614174007'
    }),
    status: zod_1.z.enum(['draft', 'submitted', 'interview', 'rejected', 'accepted']).optional().openapi({
        description: 'Updated application status',
        example: 'interview',
        enum: ['draft', 'submitted', 'interview', 'rejected', 'accepted']
    }),
    application_date: zod_1.z.coerce.date().optional().nullable().openapi({
        description: 'Date when the application was submitted or status changed',
        example: '2024-01-20T10:30:00Z'
    }),
    notes: zod_1.z.string().optional().nullable().openapi({
        description: 'Timeline notes or comments about this update',
        example: 'Phone interview scheduled for Friday at 2pm'
    }),
    event_type: zod_1.z.enum(['status_change', 'note_added', 'interview_scheduled', 'follow_up', 'other']).optional().default('status_change').openapi({
        description: 'Type of timeline event',
        example: 'interview_scheduled',
        enum: ['status_change', 'note_added', 'interview_scheduled', 'follow_up', 'other']
    })
}).openapi({
    title: 'ApplicationTimelineUpdateSchema',
    description: 'Schema for timeline-focused application updates'
});
exports.TimelineEventSchema = zod_1.z.object({
    event_type: zod_1.z.string().openapi({
        description: 'Type of timeline event',
        example: 'status_change'
    }),
    previous_value: zod_1.z.string().optional().nullable().openapi({
        description: 'Previous value (e.g., previous status)',
        example: 'submitted'
    }),
    new_value: zod_1.z.string().openapi({
        description: 'New value (e.g., new status)',
        example: 'interview'
    }),
    notes: zod_1.z.string().optional().nullable().openapi({
        description: 'Notes about this timeline event',
        example: 'Phone interview scheduled for Friday'
    }),
    timestamp: zod_1.z.coerce.date().openapi({
        description: 'When this event occurred',
        example: '2024-01-20T10:30:00Z'
    }),
    field_changed: zod_1.z.string().optional().openapi({
        description: 'Which field was changed',
        example: 'status'
    })
}).openapi({
    title: 'TimelineEventSchema',
    description: 'Individual timeline event details'
});
