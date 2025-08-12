"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const profile_1 = require("../src/validators/profile");
(0, globals_1.describe)('Profile Validation - Critical Tests', () => {
    (0, globals_1.it)('should validate a complete valid profile', () => {
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
        const result = profile_1.ProfileDTO.safeParse(validProfile);
        (0, globals_1.expect)(result.success).toBe(true);
    });
    (0, globals_1.it)('should pass validation when optional fields are missing', () => {
        const profileWithMissingOptionalFields = {
            surname: 'Doe',
            // forename is optional, so this should pass
        };
        const result = profile_1.ProfileDTO.safeParse(profileWithMissingOptionalFields);
        (0, globals_1.expect)(result.success).toBe(true);
    });
    (0, globals_1.it)('should fail validation for invalid field values', () => {
        var _a;
        const invalidProfile = {
            forename: '', // Empty string should fail min(1) validation
            surname: 'Doe',
        };
        const result = profile_1.ProfileDTO.safeParse(invalidProfile);
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)((_a = result.error) === null || _a === void 0 ? void 0 : _a.issues[0].path).toContain('forename');
    });
    (0, globals_1.it)('should handle optional and nullable fields correctly', () => {
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
        const result = profile_1.ProfileDTO.safeParse(profile);
        (0, globals_1.expect)(result.success).toBe(true);
    });
    (0, globals_1.it)('should coerce date strings to Date objects', () => {
        const employmentRecord = {
            employer: 'Company A',
            position: 'Developer',
            start_date: '2020-01-01',
            end_date: '2021-01-01',
        };
        const result = profile_1.EmploymentRecordDTO.safeParse(employmentRecord);
        (0, globals_1.expect)(result.success).toBe(true);
        if (result.success) {
            (0, globals_1.expect)(result.data.start_date instanceof Date).toBe(true);
            (0, globals_1.expect)(result.data.end_date instanceof Date).toBe(true);
        }
    });
    (0, globals_1.it)('should validate enums correctly', () => {
        (0, globals_1.expect)(() => profile_1.UserRoleEnum.parse('user')).not.toThrow();
        (0, globals_1.expect)(() => profile_1.UserRoleEnum.parse('admin')).not.toThrow();
        (0, globals_1.expect)(() => profile_1.UserRoleEnum.parse('invalid')).toThrow();
        (0, globals_1.expect)(() => profile_1.ProficiencyLevelEnum.parse('Beginner')).not.toThrow();
        (0, globals_1.expect)(() => profile_1.ProficiencyLevelEnum.parse('Native')).not.toThrow();
        (0, globals_1.expect)(() => profile_1.ProficiencyLevelEnum.parse('invalid')).toThrow();
    });
});
