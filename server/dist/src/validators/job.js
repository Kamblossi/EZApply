"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobStatusUpdateSchema = exports.JobInsertSchema = exports.JobDTO = void 0;
// server/src/validators/job.ts
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
exports.JobDTO = zod_1.z.object({
    id: zod_1.z.string().uuid().optional().openapi({
        description: 'Unique identifier for the job',
        example: '123e4567-e89b-12d3-a456-426614174007'
    }),
    title: zod_1.z.string().min(1, 'Job title is required.').openapi({
        description: 'Job title or position name',
        example: 'Senior Staff Nurse - Cardiology'
    }),
    company: zod_1.z.string().min(1, 'Company name is required.').openapi({
        description: 'Company or organization name',
        example: 'NHS Foundation Trust'
    }),
    location: zod_1.z.string().optional().nullable().openapi({
        description: 'Job location',
        example: 'London, UK'
    }),
    description: zod_1.z.string().optional().nullable().openapi({
        description: 'Detailed job description',
        example: 'We are seeking an experienced Senior Staff Nurse to join our Cardiology team...'
    }),
    url: zod_1.z.string().url('Invalid URL format.').optional().nullable().openapi({
        description: 'Original job posting URL',
        example: 'https://www.jobs.nhs.uk/xi/vacancy/916123456'
    }),
    status: zod_1.z.enum(['open', 'closed', 'archived']).default('open').openapi({
        description: 'Current status of the job posting',
        example: 'open',
        enum: ['open', 'closed', 'archived']
    }),
    posted_date: zod_1.z.coerce.date().optional().nullable().openapi({
        description: 'Date when the job was posted',
        example: '2024-01-15'
    }),
    deadline_date: zod_1.z.coerce.date().optional().nullable().openapi({
        description: 'Application deadline date',
        example: '2024-02-15'
    }),
}).openapi({
    title: 'JobDTO',
    description: 'Job posting information'
});
exports.JobInsertSchema = zod_1.z.object({
    title: zod_1.z.string().min(3, 'Job title must be at least 3 characters').openapi({
        description: 'Job title or position name',
        example: 'Band 5 Staff Nurse - ICU'
    }),
    company: zod_1.z.string().min(2, 'Company name must be at least 2 characters').openapi({
        description: 'Company or organization name',
        example: 'NHS Oxford Foundation Trust'
    }),
    location: zod_1.z.string().optional().openapi({
        description: 'Job location',
        example: 'Oxford, UK'
    }),
    url: zod_1.z.string().url('Invalid URL format').openapi({
        description: 'Original job posting URL (used for deduplication)',
        example: 'https://www.jobs.nhs.uk/xi/vacancy/916123456'
    }),
    description: zod_1.z.string().optional().openapi({
        description: 'Detailed job description',
        example: 'We are seeking an experienced Band 5 Staff Nurse to join our ICU team...'
    }),
    status: zod_1.z.enum(['draft', 'submitted', 'interview', 'rejected', 'accepted']).optional().default('draft').openapi({
        description: 'Initial application status for this job',
        example: 'draft',
        enum: ['draft', 'submitted', 'interview', 'rejected', 'accepted']
    })
}).openapi({
    title: 'JobInsertSchema',
    description: 'Schema for adding a job to user tracker (shared job model)'
});
exports.JobStatusUpdateSchema = zod_1.z.object({
    status: zod_1.z.enum(['open', 'closed', 'archived']).openapi({
        description: 'Updated status for the job posting',
        example: 'closed',
        enum: ['open', 'closed', 'archived']
    })
}).openapi({
    title: 'JobStatusUpdateSchema',
    description: 'Schema for updating job posting status'
});
