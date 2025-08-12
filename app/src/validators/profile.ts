import { z } from "zod";

// Employment Record Schema - aligned with backend
export const employmentRecordSchema = z.object({
  id: z.string().uuid().optional(),
  employer: z.string().min(1, "Employer name is required"),
  position: z.string().min(1, "Position is required"),
  start_date: z.date({ message: "Start date is required" }),
  end_date: z.date().nullable().optional(),
  responsibilities: z.string().max(5000).optional(),
  reason_for_leaving: z.string().max(1000).optional(),
  salary_information: z.string().max(500).optional(),
}).refine(data => data.end_date === null || data.end_date === undefined || !data.start_date || !data.end_date || data.start_date < data.end_date, {
  message: "End date must be after start date",
  path: ["end_date"],
});

// Education Record Schema - aligned with backend
export const educationRecordSchema = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().min(1, "Institution name is required"),
  qualification_type: z.string().min(1, "Qualification type is required"),
  degree_diploma: z.string().min(1, "Degree/diploma is required"),
  field_of_study: z.string().optional().nullable(),
  start_date: z.date({ message: "Start date is required" }),
  end_date: z.date().nullable().optional(),
  grade_score: z.string().max(100).optional().nullable(),
}).refine(data => data.end_date === null || data.end_date === undefined || !data.start_date || !data.end_date || data.start_date < data.end_date, {
  message: "End date must be after start date",
  path: ["end_date"],
});

// Reference Contact Schema - aligned with backend
export const referenceContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Reference name is required"),
  email: z.string().email("Please enter a valid email address").optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  relationship: z.string().min(1, "Relationship is required"),
});

// Complete Profile Schema - for use with react-hook-form
export const completeProfileSchema = z.object({
  // Personal Information
  forename: z.string().min(1, "Forename is required"),
  surname: z.string().min(1, "Surname is required"),
  mobile_phone: z.string().optional(),
  dob: z.date().optional().nullable(),
  
  // Address Information
  address_line_1: z.string().optional(),
  address_line_2: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  country: z.string().optional(),
  postcode: z.string().optional(),
  
  // Avatar
  avatar: z.any().optional(),
  
  // Related Arrays
  employment_records: z.array(employmentRecordSchema),
  education_records: z.array(educationRecordSchema),
  reference_contacts: z.array(referenceContactSchema),
});

export type CompleteProfile = z.infer<typeof completeProfileSchema>;
export type EmploymentRecord = z.infer<typeof employmentRecordSchema>;
export type EducationRecord = z.infer<typeof educationRecordSchema>;
export type ReferenceContact = z.infer<typeof referenceContactSchema>;