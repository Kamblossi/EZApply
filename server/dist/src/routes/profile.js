"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/profile.ts
const express_1 = require("express");
const db_1 = require("../db");
const profile_1 = require("../validators/profile");
const auth_1 = require("../middleware/auth");
const profileRouter = (0, express_1.Router)();
profileRouter.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }
    try {
        const profileQueryResult = yield db_1.db.query(`
      SELECT
          up.id AS profile_id,
          up.user_id,
          up.forename,
          up.surname,
          up.middle_names,
          up.title,
          up.ni_number,
          up.available_date,
          up.mobile_phone,
          up.home_phone,
          up.work_phone,
          up.address_line_1,
          up.address_line_2,
          up.city,
          up.county,
          up.country,
          up.postcode,
          up.employment_status_with_target_org,
          up.immigration_status,
          up.read_job_desc_ack,
          up.nvq_level3_healthcare_ack,
          up.privacy_notice_consent_ack,
          up.professional_registration_details,
          up.disclosure_relationship_org_members,
          up.disclosure_previous_dismissal,
          up.disclosure_criminal_convictions,
          up.disclosure_health,
          up.personal_statement,
          up.person_specification_response,
          up.additional_information,
          COALESCE(json_agg(DISTINCT er.*) FILTER (WHERE er.id IS NOT NULL), '[]') AS employment_records,
          COALESCE(json_agg(DISTINCT edr.*) FILTER (WHERE edr.id IS NOT NULL), '[]') AS education_records,
          COALESCE(json_agg(DISTINCT rcr.*) FILTER (WHERE rcr.id IS NOT NULL), '[]') AS reference_contacts,
          COALESCE(json_agg(DISTINCT udr.*) FILTER (WHERE udr.id IS NOT NULL), '[]') AS user_documents,
          COALESCE(json_agg(DISTINCT usr.*) FILTER (WHERE usr.id IS NOT NULL), '[]') AS user_skills
      FROM
          user_profiles up
      LEFT JOIN
          employment_records er ON er.user_profile_id = up.id
      LEFT JOIN
          education_records edr ON edr.user_profile_id = up.id
      LEFT JOIN
          reference_contacts rcr ON rcr.user_profile_id = up.id
      LEFT JOIN
          user_documents udr ON udr.user_profile_id = up.id
      LEFT JOIN
          user_skills usr ON usr.user_profile_id = up.id
      WHERE
          up.user_id = $1
      GROUP BY
          up.id;
    `, [userId]);
        const rawProfile = profileQueryResult.rows[0];
        if (!rawProfile) {
            // If no profile exists, return an empty profile with basic user_id
            // Forename and surname are part of user_profiles, not users table.
            // So, if no profile, these will be null/undefined until a profile is created.
            const emptyProfile = {
                user_id: userId,
                forename: null, // No forename in users table
                surname: null, // No surname in users table
                employment_records: [],
                education_records: [],
                reference_contacts: [],
                user_documents: [],
                user_skills: [],
            };
            const parsedEmptyProfile = profile_1.ProfileDTO.parse(emptyProfile);
            return res.status(200).json(parsedEmptyProfile);
        }
        const transformedProfile = Object.assign(Object.assign({}, rawProfile), { id: rawProfile.profile_id, available_date: rawProfile.available_date ? new Date(rawProfile.available_date) : null, employment_records: rawProfile.employment_records.map((rec) => (Object.assign(Object.assign({}, rec), { start_date: new Date(rec.start_date), end_date: rec.end_date ? new Date(rec.end_date) : null }))), education_records: rawProfile.education_records.map((rec) => (Object.assign(Object.assign({}, rec), { start_date: new Date(rec.start_date), end_date: rec.end_date ? new Date(rec.end_date) : null }))), user_documents: rawProfile.user_documents.map((doc) => (Object.assign(Object.assign({}, doc), { uploaded_at: doc.uploaded_at ? new Date(doc.uploaded_at) : null }))) });
        const validatedProfile = profile_1.ProfileDTO.parse(transformedProfile);
        res.status(200).json(validatedProfile);
    }
    catch (error) {
        console.error('Error fetching profile:', error);
        if (error.issues) {
            return res.status(400).json({ message: "Validation error on retrieved data", errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
    }
}));
// PUT /api/profile (updated to handle child tables with transaction)
profileRouter.put('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }
    let client; // Declare client outside try-catch for finally block
    try {
        // 1. Validate incoming request body against ProfileDTO
        const incomingProfile = profile_1.ProfileDTO.parse(req.body);
        // Destructure master profile fields and nested arrays
        const { employment_records = [], education_records = [], reference_contacts = [], user_documents = [], user_skills = [], id, user_id: incoming_user_id } = incomingProfile, // Exclude id and incoming user_id from direct update payload
        masterProfileData = __rest(incomingProfile, ["employment_records", "education_records", "reference_contacts", "user_documents", "user_skills", "id", "user_id"]) // This will contain all direct user_profiles fields
        ;
        client = yield db_1.db.connect(); // Get a client from the pool
        yield client.query('BEGIN'); // Start transaction
        // --- Master Profile Upsert ---
        const sanitizedMasterProfileData = Object.assign({}, masterProfileData);
        if (sanitizedMasterProfileData.available_date) {
            sanitizedMasterProfileData.available_date = sanitizedMasterProfileData.available_date.toISOString();
        }
        const masterColumns = Object.keys(sanitizedMasterProfileData).filter(key => key !== 'id' && key !== 'user_id');
        const masterValues = masterColumns.map(col => sanitizedMasterProfileData[col]);
        const masterSetClause = masterColumns.map((col, index) => `${col} = $${index + 2 + masterColumns.length}`).join(', ');
        const masterUpsertQuery = `
      INSERT INTO user_profiles (
          id, user_id, ${masterColumns.join(', ')}
      ) VALUES (
          COALESCE((SELECT id FROM user_profiles WHERE user_id = $1), gen_random_uuid()), -- Use gen_random_uuid()
          $1, ${masterColumns.map((_, i) => `$${i + 2}`).join(', ')}
      )
      ON CONFLICT (user_id) DO UPDATE SET
          ${masterSetClause}
      RETURNING *;
    `;
        const masterResult = yield client.query(masterUpsertQuery, [userId, ...masterValues, ...masterValues]);
        const updatedMasterProfile = masterResult.rows[0];
        const userProfileId = updatedMasterProfile.id; // Get the ID of the master profile row
        // --- Child Tables: Delete existing and Insert new ---
        // Employment Records
        console.log('Processing employment records for userProfileId:', userProfileId);
        console.log('Employment records to insert:', employment_records);
        yield client.query('DELETE FROM employment_records WHERE user_profile_id = $1;', [userProfileId]);
        for (const record of employment_records) {
            // Convert dates to ISO strings for DB
            const startDate = record.start_date ? record.start_date.toISOString() : null;
            const endDate = record.end_date ? record.end_date.toISOString() : null;
            yield client.query(`INSERT INTO employment_records (id, user_profile_id, employer, position, start_date, end_date, responsibilities, reason_for_leaving, salary_information)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8);`, [userProfileId, record.employer, record.position, startDate, endDate, record.responsibilities, record.reason_for_leaving, record.salary_information]);
        }
        // Education Records
        yield client.query('DELETE FROM education_records WHERE user_profile_id = $1;', [userProfileId]);
        for (const record of education_records) {
            const startDate = record.start_date ? record.start_date.toISOString() : null;
            const endDate = record.end_date ? record.end_date.toISOString() : null;
            yield client.query(`INSERT INTO education_records (id, user_profile_id, institution, qualification_type, degree_diploma, field_of_study, start_date, end_date, grade_score)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8);`, [userProfileId, record.institution, record.qualification_type, record.degree_diploma, record.field_of_study, startDate, endDate, record.grade_score]);
        }
        // Reference Contacts
        yield client.query('DELETE FROM reference_contacts WHERE user_profile_id = $1;', [userProfileId]);
        for (const record of reference_contacts) {
            yield client.query(`INSERT INTO reference_contacts (id, user_profile_id, name, relationship, email, phone, company, position)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7);`, [userProfileId, record.name, record.relationship, record.email, record.phone, record.company, record.position]);
        }
        // User Documents
        yield client.query('DELETE FROM user_documents WHERE user_profile_id = $1;', [userProfileId]);
        for (const record of user_documents) {
            const uploadedAt = record.uploaded_at ? record.uploaded_at.toISOString() : null;
            yield client.query(`INSERT INTO user_documents (id, user_profile_id, file_name, file_path, document_type, mime_type, uploaded_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6);`, [userProfileId, record.file_name, record.file_path, record.document_type, record.mime_type, uploadedAt]);
        }
        // User Skills
        yield client.query('DELETE FROM user_skills WHERE user_profile_id = $1;', [userProfileId]);
        for (const record of user_skills) {
            yield client.query(`INSERT INTO user_skills (id, user_profile_id, skill_name, proficiency_level, category)
         VALUES (gen_random_uuid(), $1, $2, $3, $4);`, [userProfileId, record.skill_name, record.proficiency_level, record.category]);
        }
        yield client.query('COMMIT'); // Commit the transaction
        // After successful update, fetch the complete profile to return the most up-to-date state
        const finalProfileQueryResult = yield db_1.db.query(`
      SELECT
          up.id AS profile_id,
          up.user_id,
          up.forename,
          up.surname,
          up.middle_names,
          up.title,
          up.ni_number,
          up.available_date,
          up.mobile_phone,
          up.home_phone,
          up.work_phone,
          up.address_line_1,
          up.address_line_2,
          up.city,
          up.county,
          up.country,
          up.postcode,
          up.employment_status_with_target_org,
          up.immigration_status,
          up.read_job_desc_ack,
          up.nvq_level3_healthcare_ack,
          up.privacy_notice_consent_ack,
          up.professional_registration_details,
          up.disclosure_relationship_org_members,
          up.disclosure_previous_dismissal,
          up.disclosure_criminal_convictions,
          up.disclosure_health,
          up.personal_statement,
          up.person_specification_response,
          up.additional_information,
          COALESCE(json_agg(DISTINCT er.*) FILTER (WHERE er.id IS NOT NULL), '[]') AS employment_records,
          COALESCE(json_agg(DISTINCT edr.*) FILTER (WHERE edr.id IS NOT NULL), '[]') AS education_records,
          COALESCE(json_agg(DISTINCT rcr.*) FILTER (WHERE rcr.id IS NOT NULL), '[]') AS reference_contacts,
          COALESCE(json_agg(DISTINCT udr.*) FILTER (WHERE udr.id IS NOT NULL), '[]') AS user_documents,
          COALESCE(json_agg(DISTINCT usr.*) FILTER (WHERE usr.id IS NOT NULL), '[]') AS user_skills
      FROM
          user_profiles up
      LEFT JOIN
          employment_records er ON er.user_profile_id = up.id
      LEFT JOIN
          education_records edr ON edr.user_profile_id = up.id
      LEFT JOIN
          reference_contacts rcr ON rcr.user_profile_id = up.id
      LEFT JOIN
          user_documents udr ON udr.user_profile_id = up.id
      LEFT JOIN
          user_skills usr ON usr.user_profile_id = up.id
      WHERE
          up.user_id = $1
      GROUP BY
          up.id;
    `, [userId]);
        const finalRawProfile = finalProfileQueryResult.rows[0];
        if (!finalRawProfile) {
            return res.status(500).json({ message: 'Profile not found after update, unexpected error.' });
        }
        const transformedFinalProfile = Object.assign(Object.assign({}, finalRawProfile), { id: finalRawProfile.profile_id, available_date: finalRawProfile.available_date ? new Date(finalRawProfile.available_date) : null, employment_records: finalRawProfile.employment_records.map((rec) => (Object.assign(Object.assign({}, rec), { start_date: new Date(rec.start_date), end_date: rec.end_date ? new Date(rec.end_date) : null }))), education_records: finalRawProfile.education_records.map((rec) => (Object.assign(Object.assign({}, rec), { start_date: new Date(rec.start_date), end_date: rec.end_date ? new Date(rec.end_date) : null }))), user_documents: finalRawProfile.user_documents.map((doc) => (Object.assign(Object.assign({}, doc), { uploaded_at: doc.uploaded_at ? new Date(doc.uploaded_at) : null }))) });
        const validatedFinalProfile = profile_1.ProfileDTO.parse(transformedFinalProfile);
        res.status(200).json(validatedFinalProfile);
    }
    catch (error) {
        console.error('Error during profile PUT operation (with child tables):', error);
        if (client) {
            yield client.query('ROLLBACK'); // Rollback transaction on error
            console.log('Transaction rolled back due to error.');
        }
        if (error.issues) {
            return res.status(400).json({ message: "Validation Error", errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to update profile due to server error', error: error.message });
    }
    finally {
        if (client) {
            client.release();
        }
    }
}));
// =====================================================================
// DELETE /api/profile
// =====================================================================
profileRouter.delete('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }
    try {
        // First, find the user_profile_id associated with the userId
        // This is important because the cascade deletion happens from user_profiles.id
        const profileIdResult = yield db_1.db.query('SELECT id FROM user_profiles WHERE user_id = $1;', [userId]);
        const userProfileId = (_b = profileIdResult.rows[0]) === null || _b === void 0 ? void 0 : _b.id;
        if (!userProfileId) {
            return res.status(404).json({ message: 'Profile not found for this user.' });
        }
        // Perform the deletion of the master profile row
        // Due to ON DELETE CASCADE, all child records linked to this user_profile_id
        // in employment_records, education_records, etc., will also be deleted.
        const deleteResult = yield db_1.db.query('DELETE FROM user_profiles WHERE id = $1 RETURNING id;', [userProfileId]);
        if (deleteResult.rowCount === 0) {
            // This case should ideally be caught by the 404 above, but good for robustness
            return res.status(404).json({ message: 'Profile not found or already deleted.' });
        }
        res.status(204).send(); // 204 No Content for successful deletion
    }
    catch (error) {
        console.error('Error during profile DELETE operation:', error);
        res.status(500).json({ message: 'Failed to delete profile due to server error', error: error.message });
    }
}));
exports.default = profileRouter;
