import { describe, it, expect } from '@jest/globals';
import {
  ProfileDTO,
  EmploymentRecordDTO,
  EducationRecordDTO,
  ReferenceContactDTO,
  UserDocumentDTO,
  UserSkillDTO,
  UserRoleEnum,
  PortalEnum,
  JobStatusEnum,
  ApplicationEventEnum,
  TemplateCategoryEnum,
  NotificationTypeEnum,
  ProficiencyLevelEnum,
} from '../src/validators/profile';

describe('Profile Validation - Critical Tests', () => {
  it('should validate a complete valid profile', () => {
    const validProfile = {
      forename: 'John',
      surname: 'Doe',
      employment_records: [
        {
          employer: 'Company A',
          position: 'Developer',
          start_date: '2020-01-01',
          end_date: '2021-01-01',
          responsibilities: 'Developed software',
          reason_for_leaving: 'Career growth',
          salary_information: '50000',
        },
      ],
      education_records: [
        {
          institution: 'University X',
          qualification_type: 'Bachelor',
          degree_diploma: 'BSc Computer Science',
          start_date: '2015-09-01',
          end_date: '2019-06-01',
          grade_score: 'First Class',
        },
      ],
      reference_contacts: [
        {
          name: 'Jane Smith',
          relationship: 'Manager',
          email: 'jane@example.com',
          phone: '1234567890',
          company: 'Company A',
          position: 'Manager',
        },
      ],
      user_documents: [
        {
          file_name: 'resume.pdf',
          file_path: '/files/resume.pdf',
          document_type: 'resume',
          mime_type: 'application/pdf',
          uploaded_at: '2023-01-01',
        },
      ],
      user_skills: [
        {
          skill_name: 'JavaScript',
          proficiency_level: 'Advanced',
          category: 'Programming',
        },
      ],
    };

    const result = ProfileDTO.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  it('should fail validation for missing required fields', () => {
    const invalidProfile = {
      surname: 'Doe',
    };
    const result = ProfileDTO.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('forename');
  });

  it('should handle optional and nullable fields correctly', () => {
    const profile = {
      forename: 'John',
      surname: 'Doe',
      middle_names: null,
      title: null,
      ni_number: null,
      available_date: null,
      mobile_phone: null,
      home_phone: null,
      work_phone: null,
      address_line_1: null,
      address_line_2: null,
      city: null,
      county: null,
      country: null,
      postcode: null,
      employment_status_with_target_org: null,
      immigration_status: null,
      read_job_desc_ack: false,
      nvq_level3_healthcare_ack: false,
      privacy_notice_consent_ack: false,
      professional_registration_details: null,
      disclosure_relationship_org_members: null,
      disclosure_previous_dismissal: null,
      disclosure_criminal_convictions: null,
      disclosure_health: null,
      personal_statement: null,
      person_specification_response: null,
      additional_information: null,
      employment_records: [],
      education_records: [],
      reference_contacts: [],
      user_documents: [],
      user_skills: [],
    };
    const result = ProfileDTO.safeParse(profile);
    expect(result.success).toBe(true);
  });

  it('should coerce date strings to Date objects', () => {
    const employmentRecord = {
      employer: 'Company A',
      position: 'Developer',
      start_date: '2020-01-01',
      end_date: '2021-01-01',
    };
    const result = EmploymentRecordDTO.safeParse(employmentRecord);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start_date instanceof Date).toBe(true);
      expect(result.data.end_date instanceof Date).toBe(true);
    }
  });

  it('should validate enums correctly', () => {
    expect(() => UserRoleEnum.parse('user')).not.toThrow();
    expect(() => UserRoleEnum.parse('admin')).not.toThrow();
    expect(() => UserRoleEnum.parse('invalid')).toThrow();

    expect(() => ProficiencyLevelEnum.parse('Beginner')).not.toThrow();
    expect(() => ProficiencyLevelEnum.parse('Native')).not.toThrow();
    expect(() => ProficiencyLevelEnum.parse('invalid')).toThrow();
  });
});
