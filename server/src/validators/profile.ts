import { z } from 'zod';

// --- Enumeration Schemas (mirroring your SQL enums) ---
export const UserRoleEnum = z.enum(['user', 'admin']);
export const PortalEnum = z.enum(['nhs_trac', 'nhs_jobs', 'workday', 'greenhouse', 'linkedin', 'indeed', 'custom']);
export const JobStatusEnum = z.enum(['saved', 'applied', 'interviewing', 'rejected', 'offer', 'hired']);
export const ApplicationEventEnum = z.enum(['application_submitted', 'resume_sent', 'phone_interview', 'onsite_interview', 'follow_up', 'offer_received', 'rejection_received', 'other']);
export const TemplateCategoryEnum = z.enum(['cover_letter', 'response', 'ai_prompt', 'email', 'other']);
export const NotificationTypeEnum = z.enum(['FollowUpReminder', 'InterviewReminder', 'DeadlineAlert', 'NewJobMatch', 'Other']);
export const ProficiencyLevelEnum = z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Native']);

// --- Sub-resource DTOs ---

export const EmploymentRecordDTO = z.object({
  id: z.string().uuid().optional(), // Optional for new records, required for updates/deletes
  employer: z.string().min(2, "Employer name must be at least 2 characters long."),
  position: z.string().min(2, "Position must be at least 2 characters long."),
  start_date: z.coerce.date({ message: "Invalid start date format." }),
  end_date: z.coerce.date({ message: "Invalid end date format." }).nullable(),
  responsibilities: z.string().max(5000, "Responsibilities cannot exceed 5000 characters.").optional().nullable(),
  reason_for_leaving: z.string().max(1000, "Reason for leaving cannot exceed 1000 characters.").optional().nullable(),
  salary_information: z.string().max(500, "Salary information cannot exceed 500 characters.").optional().nullable(),
});

export const EducationRecordDTO = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().min(2, "Institution name must be at least 2 characters long."),
  qualification_type: z.string().min(2, "Qualification type must be at least 2 characters long."),
  degree_diploma: z.string().min(2, "Degree/diploma must be at least 2 characters long."),
  field_of_study: z.string().min(2, "Field of study must be at least 2 characters long.").optional().nullable(),
  start_date: z.coerce.date({ message: "Invalid start date format." }),
  end_date: z.coerce.date({ message: "Invalid end date format." }).nullable(),
  grade_score: z.string().max(100, "Grade/score cannot exceed 100 characters.").optional().nullable(),
});

export const ReferenceContactDTO = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Reference name must be at least 2 characters long."),
  relationship: z.string().min(2, "Relationship must be at least 2 characters long."),
  email: z.string().email("Invalid email format.").optional().nullable(),
  phone: z.string().optional().nullable(), // Basic string for now, could add regex for phone format
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
});

export const UserDocumentDTO = z.object({
  id: z.string().uuid().optional(),
  file_name: z.string().min(1, "File name cannot be empty."),
  file_path: z.string().min(1, "File path cannot be empty."),
  document_type: z.string().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  uploaded_at: z.coerce.date().optional(), // Will be set by backend, optional for DTO input
});

export const UserSkillDTO = z.object({
  id: z.string().uuid().optional(),
  skill_name: z.string().min(1, "Skill name cannot be empty."),
  proficiency_level: ProficiencyLevelEnum.optional().nullable(),
  category: z.string().optional().nullable(),
});

// --- Main Profile DTO ---

export const ProfileDTO = z.object({
  // user_profiles table fields
  id: z.string().uuid().optional(), // The user_profile_id, optional for initial creation
  user_id: z.string().uuid().optional(), // Will be set by backend, optional for DTO input
  forename: z.string().min(1, "Forename is required."),
  surname: z.string().min(1, "Surname is required."),
  middle_names: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  ni_number: z.string().optional().nullable(),
  available_date: z.coerce.date({ message: "Invalid available date format." }).optional().nullable(),
  mobile_phone: z.string().optional().nullable(),
  home_phone: z.string().optional().nullable(),
  work_phone: z.string().optional().nullable(),
  address_line_1: z.string().optional().nullable(),
  address_line_2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  county: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  employment_status_with_target_org: z.string().optional().nullable(),
  immigration_status: z.string().optional().nullable(),
  read_job_desc_ack: z.boolean().default(false).optional(),
  nvq_level3_healthcare_ack: z.boolean().default(false).optional(),
  privacy_notice_consent_ack: z.boolean().default(false).optional(),
  professional_registration_details: z.string().optional().nullable(),
  disclosure_relationship_org_members: z.string().optional().nullable(),
  disclosure_previous_dismissal: z.string().optional().nullable(),
  disclosure_criminal_convictions: z.string().optional().nullable(),
  disclosure_health: z.string().optional().nullable(),
  personal_statement: z.string().max(5000, "Personal statement cannot exceed 5000 characters.").optional().nullable(),
  person_specification_response: z.string().max(5000, "Person specification response cannot exceed 5000 characters.").optional().nullable(),
  additional_information: z.string().max(5000, "Additional information cannot exceed 5000 characters.").optional().nullable(),
  // created_at and updated_at are handled by the database

  // Nested sub-resources (arrays of DTOs)
  employment_records: z.array(EmploymentRecordDTO).optional(),
  education_records: z.array(EducationRecordDTO).optional(),
  reference_contacts: z.array(ReferenceContactDTO).optional(),
  user_documents: z.array(UserDocumentDTO).optional(),
  user_skills: z.array(UserSkillDTO).optional(),
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
