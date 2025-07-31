import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

// --- Enumeration Schemas (mirroring your SQL enums) ---
export const UserRoleEnum = z.enum(['user', 'admin']).openapi({
  description: 'User role in the system'
});
export const PortalEnum = z.enum(['nhs_trac', 'nhs_jobs', 'workday', 'greenhouse', 'linkedin', 'indeed', 'custom']).openapi({
  description: 'Job portal or application tracking system'
});
export const JobStatusEnum = z.enum(['saved', 'applied', 'interviewing', 'rejected', 'offer', 'hired']).openapi({
  description: 'Current status of job application'
});
export const ApplicationEventEnum = z.enum(['application_submitted', 'resume_sent', 'phone_interview', 'onsite_interview', 'follow_up', 'offer_received', 'rejection_received', 'other']).openapi({
  description: 'Type of application event or milestone'
});
export const TemplateCategoryEnum = z.enum(['cover_letter', 'response', 'ai_prompt', 'email', 'other']).openapi({
  description: 'Category of template or document'
});
export const NotificationTypeEnum = z.enum(['FollowUpReminder', 'InterviewReminder', 'DeadlineAlert', 'NewJobMatch', 'Other']).openapi({
  description: 'Type of notification or reminder'
});
export const ProficiencyLevelEnum = z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Native']).openapi({
  description: 'Skill proficiency level'
});

// --- Sub-resource DTOs ---

export const EmploymentRecordDTO = z.object({
  id: z.string().uuid().optional().openapi({ 
    description: 'Unique identifier for employment record',
    example: '123e4567-e89b-12d3-a456-426614174000'
  }),
  employer: z.string().min(2, "Employer name must be at least 2 characters long.").openapi({
    description: 'Name of the employer organization',
    example: 'NHS Foundation Trust'
  }),
  position: z.string().min(2, "Position must be at least 2 characters long.").openapi({
    description: 'Job title or position held',
    example: 'Senior Nurse'
  }),
  start_date: z.coerce.date({ message: "Invalid start date format." }).openapi({
    description: 'Employment start date',
    example: '2020-01-15'
  }),
  end_date: z.coerce.date({ message: "Invalid end date format." }).nullable().openapi({
    description: 'Employment end date (null if current position)',
    example: '2023-06-30'
  }),
  responsibilities: z.string().max(5000, "Responsibilities cannot exceed 5000 characters.").optional().nullable().openapi({
    description: 'Key responsibilities and duties',
    example: 'Patient care, medication administration, team leadership'
  }),
  reason_for_leaving: z.string().max(1000, "Reason for leaving cannot exceed 1000 characters.").optional().nullable().openapi({
    description: 'Reason for leaving this position',
    example: 'Career advancement opportunity'
  }),
  salary_information: z.string().max(500, "Salary information cannot exceed 500 characters.").optional().nullable().openapi({
    description: 'Salary or compensation details',
    example: '£35,000 - £42,000 per annum'
  }),
}).openapi({
  title: 'EmploymentRecordDTO',
  description: 'Employment history record'
});

export const EducationRecordDTO = z.object({
  id: z.string().uuid().optional().openapi({
    description: 'Unique identifier for education record',
    example: '123e4567-e89b-12d3-a456-426614174001'
  }),
  institution: z.string().min(2, "Institution name must be at least 2 characters long.").openapi({
    description: 'Educational institution name',
    example: 'University of Manchester'
  }),
  qualification_type: z.string().min(2, "Qualification type must be at least 2 characters long.").openapi({
    description: 'Type of qualification',
    example: 'Bachelor of Science'
  }),
  degree_diploma: z.string().min(2, "Degree/diploma must be at least 2 characters long.").openapi({
    description: 'Specific degree or diploma name',
    example: 'Nursing Studies'
  }),
  field_of_study: z.string().min(2, "Field of study must be at least 2 characters long.").optional().nullable().openapi({
    description: 'Field or area of study',
    example: 'Healthcare and Medical Sciences'
  }),
  start_date: z.coerce.date({ message: "Invalid start date format." }).openapi({
    description: 'Education start date',
    example: '2018-09-01'
  }),
  end_date: z.coerce.date({ message: "Invalid end date format." }).nullable().openapi({
    description: 'Education end date (null if ongoing)',
    example: '2021-06-30'
  }),
  grade_score: z.string().max(100, "Grade/score cannot exceed 100 characters.").optional().nullable().openapi({
    description: 'Grade, score, or classification achieved',
    example: 'First Class Honours'
  }),
}).openapi({
  title: 'EducationRecordDTO',
  description: 'Education history record'
});

export const ReferenceContactDTO = z.object({
  id: z.string().uuid().optional().openapi({
    description: 'Unique identifier for reference contact',
    example: '123e4567-e89b-12d3-a456-426614174002'
  }),
  name: z.string().min(2, "Reference name must be at least 2 characters long.").openapi({
    description: 'Full name of the reference contact',
    example: 'Dr. Sarah Johnson'
  }),
  relationship: z.string().min(2, "Relationship must be at least 2 characters long.").openapi({
    description: 'Relationship to the applicant',
    example: 'Former Line Manager'
  }),
  email: z.string().email("Invalid email format.").optional().nullable().openapi({
    description: 'Email address of the reference',
    example: 'sarah.johnson@hospital.nhs.uk'
  }),
  phone: z.string().optional().nullable().openapi({
    description: 'Phone number of the reference',
    example: '+44 20 7946 0958'
  }),
  company: z.string().optional().nullable().openapi({
    description: 'Company or organization of the reference',
    example: 'Royal London Hospital'
  }),
  position: z.string().optional().nullable().openapi({
    description: 'Job title or position of the reference',
    example: 'Head of Nursing'
  }),
}).openapi({
  title: 'ReferenceContactDTO',
  description: 'Professional reference contact'
});

export const UserDocumentDTO = z.object({
  id: z.string().uuid().optional().openapi({
    description: 'Unique identifier for document',
    example: '123e4567-e89b-12d3-a456-426614174003'
  }),
  file_name: z.string().min(1, "File name cannot be empty.").openapi({
    description: 'Original name of the uploaded file',
    example: 'CV_John_Smith_2024.pdf'
  }),
  file_path: z.string().min(1, "File path cannot be empty.").openapi({
    description: 'Server file path or storage location',
    example: '/uploads/documents/user123/cv.pdf'
  }),
  document_type: z.string().optional().nullable().openapi({
    description: 'Type or category of document',
    example: 'CV'
  }),
  mime_type: z.string().optional().nullable().openapi({
    description: 'MIME type of the uploaded file',
    example: 'application/pdf'
  }),
  uploaded_at: z.coerce.date().optional().openapi({
    description: 'Date and time when document was uploaded',
    example: '2024-01-15T10:30:00Z'
  }),
}).openapi({
  title: 'UserDocumentDTO',
  description: 'User uploaded document'
});

export const UserSkillDTO = z.object({
  id: z.string().uuid().optional().openapi({
    description: 'Unique identifier for skill',
    example: '123e4567-e89b-12d3-a456-426614174004'
  }),
  skill_name: z.string().min(1, "Skill name cannot be empty.").openapi({
    description: 'Name of the skill or competency',
    example: 'Patient Care'
  }),
  proficiency_level: ProficiencyLevelEnum.optional().nullable().openapi({
    description: 'Level of proficiency in this skill',
    example: 'Advanced'
  }),
  category: z.string().optional().nullable().openapi({
    description: 'Category or classification of the skill',
    example: 'Clinical Skills'
  }),
}).openapi({
  title: 'UserSkillDTO',
  description: 'User skill or competency'
});

// --- Main Profile DTO ---

export const ProfileDTO = z.object({
  // user_profiles table fields
  id: z.string().uuid().optional().openapi({
    description: 'Unique identifier for user profile',
    example: '123e4567-e89b-12d3-a456-426614174005'
  }),
  user_id: z.string().uuid().optional().openapi({
    description: 'Associated user account ID',
    example: '123e4567-e89b-12d3-a456-426614174006'
  }),
  forename: z.string().min(1, "Forename is required.").optional().nullable().openapi({
    description: 'First name',
    example: 'John'
  }),
  surname: z.string().min(1, "Surname is required.").optional().nullable().openapi({
    description: 'Last name',
    example: 'Smith'
  }),
  middle_names: z.string().optional().nullable().openapi({
    description: 'Middle names',
    example: 'Michael'
  }),
  title: z.string().optional().nullable().openapi({
    description: 'Professional title or honorific',
    example: 'Dr.'
  }),
  ni_number: z.string().optional().nullable().openapi({
    description: 'National Insurance number',
    example: 'AB123456C'
  }),
  available_date: z.coerce.date({ message: "Invalid available date format." }).optional().nullable().openapi({
    description: 'Date available to start work',
    example: '2024-03-01'
  }),
  mobile_phone: z.string().optional().nullable().openapi({
    description: 'Mobile phone number',
    example: '+44 7700 900123'
  }),
  home_phone: z.string().optional().nullable().openapi({
    description: 'Home phone number',
    example: '+44 20 7946 0958'
  }),
  work_phone: z.string().optional().nullable().openapi({
    description: 'Work phone number',
    example: '+44 20 7946 0959'
  }),
  address_line_1: z.string().optional().nullable().openapi({
    description: 'First line of address',
    example: '123 Main Street'
  }),
  address_line_2: z.string().optional().nullable().openapi({
    description: 'Second line of address',
    example: 'Apartment 4B'
  }),
  city: z.string().optional().nullable().openapi({
    description: 'City or town',
    example: 'London'
  }),
  county: z.string().optional().nullable().openapi({
    description: 'County or region',
    example: 'Greater London'
  }),
  country: z.string().optional().nullable().openapi({
    description: 'Country',
    example: 'United Kingdom'
  }),
  postcode: z.string().optional().nullable().openapi({
    description: 'Postal code',
    example: 'SW1A 1AA'
  }),
  employment_status_with_target_org: z.string().optional().nullable().openapi({
    description: 'Current employment status with target organization',
    example: 'Not currently employed'
  }),
  immigration_status: z.string().optional().nullable().openapi({
    description: 'Immigration or work authorization status',
    example: 'British Citizen'
  }),
  read_job_desc_ack: z.boolean().default(false).optional().openapi({
    description: 'Acknowledgment of reading job description',
    example: true
  }),
  nvq_level3_healthcare_ack: z.boolean().default(false).optional().openapi({
    description: 'Acknowledgment of NVQ Level 3 Healthcare requirement',
    example: true
  }),
  privacy_notice_consent_ack: z.boolean().default(false).optional().openapi({
    description: 'Consent to privacy notice',
    example: true
  }),
  professional_registration_details: z.string().optional().nullable().openapi({
    description: 'Professional registration details',
    example: 'NMC PIN: 12A3456E'
  }),
  disclosure_relationship_org_members: z.string().optional().nullable().openapi({
    description: 'Disclosure of relationships with organization members',
    example: 'None'
  }),
  disclosure_previous_dismissal: z.string().optional().nullable().openapi({
    description: 'Disclosure of previous dismissals',
    example: 'None'
  }),
  disclosure_criminal_convictions: z.string().optional().nullable().openapi({
    description: 'Disclosure of criminal convictions',
    example: 'None'
  }),
  disclosure_health: z.string().optional().nullable().openapi({
    description: 'Health-related disclosures',
    example: 'None'
  }),
  personal_statement: z.string().max(5000, "Personal statement cannot exceed 5000 characters.").optional().nullable().openapi({
    description: 'Personal statement or cover letter',
    example: 'Experienced healthcare professional with 5 years of experience...'
  }),
  person_specification_response: z.string().max(5000, "Person specification response cannot exceed 5000 characters.").optional().nullable().openapi({
    description: 'Response to person specification requirements',
    example: 'I meet all essential criteria including...'
  }),
  additional_information: z.string().max(5000, "Additional information cannot exceed 5000 characters.").optional().nullable().openapi({
    description: 'Additional relevant information',
    example: 'Available for flexible working arrangements...'
  }),

  // Nested sub-resources (arrays of DTOs)
  employment_records: z.array(EmploymentRecordDTO).optional().openapi({
    description: 'Employment history records'
  }),
  education_records: z.array(EducationRecordDTO).optional().openapi({
    description: 'Education history records'
  }),
  reference_contacts: z.array(ReferenceContactDTO).optional().openapi({
    description: 'Professional reference contacts'
  }),
  user_documents: z.array(UserDocumentDTO).optional().openapi({
    description: 'Uploaded documents'
  }),
  user_skills: z.array(UserSkillDTO).optional().openapi({
    description: 'Skills and competencies'
  }),
}).openapi({
  title: 'ProfileDTO',
  description: 'Complete user profile with all associated records'
});

// Infer TypeScript types from Zod schemas for use in other parts of the application
export type Profile = z.infer<typeof ProfileDTO>;
export type EmploymentRecord = z.infer<typeof EmploymentRecordDTO>;
export type EducationRecord = z.infer<typeof EducationRecordDTO>;
export type ReferenceContact = z.infer<typeof ReferenceContactDTO>;
export type UserDocument = z.infer<typeof UserDocumentDTO>;
export type UserSkill = z.infer<typeof UserSkillDTO>;

// Exporting the enums as types as well for convenience
export type UserRole = z.infer<typeof UserRoleEnum>;
export type Portal = z.infer<typeof PortalEnum>;
export type JobStatus = z.infer<typeof JobStatusEnum>;
export type ApplicationEvent = z.infer<typeof ApplicationEventEnum>;
export type TemplateCategory = z.infer<typeof TemplateCategoryEnum>;
export type NotificationType = z.infer<typeof NotificationTypeEnum>;
export type ProficiencyLevel = z.infer<typeof ProficiencyLevelEnum>;
