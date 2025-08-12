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
Object.defineProperty(exports, "__esModule", { value: true });
exports.educationRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const profile_1 = require("../validators/profile");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.educationRouter = router;
// Get all education records for the authenticated user
router.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Get user's profile ID first
        const profileResult = yield db_1.db.query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found' });
        }
        const userProfileId = profileResult.rows[0].id;
        // Get all education records
        const result = yield db_1.db.query(`SELECT id, institution, qualification_type, degree_diploma, field_of_study, 
              start_date, end_date, grade_score, created_at, created_at as updated_at
       FROM education_records 
       WHERE user_profile_id = $1 
       ORDER BY start_date DESC`, [userProfileId]);
        const validatedRecords = zod_1.z.array(profile_1.EducationRecordDTO).parse(result.rows);
        res.status(200).json({ data: validatedRecords });
    }
    catch (error) {
        console.error('Error fetching education records:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get a specific education record
router.get('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const recordId = req.params.id;
        // Verify the record belongs to the user
        const result = yield db_1.db.query(`SELECT er.id, er.institution, er.qualification_type, er.degree_diploma, 
              er.field_of_study, er.start_date, er.end_date, er.grade_score,
              er.created_at, er.created_at as updated_at
       FROM education_records er
       JOIN user_profiles up ON er.user_profile_id = up.id
       WHERE er.id = $1 AND up.user_id = $2`, [recordId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Education record not found' });
        }
        const validatedRecord = profile_1.EducationRecordDTO.parse(result.rows[0]);
        res.status(200).json(validatedRecord);
    }
    catch (error) {
        console.error('Error fetching education record:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Create a new education record
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const educationData = profile_1.EducationRecordDTO.parse(req.body);
        // Get user's profile ID
        const profileResult = yield db_1.db.query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
        }
        const userProfileId = profileResult.rows[0].id;
        // Insert the new education record
        const result = yield db_1.db.query(`INSERT INTO education_records 
       (user_profile_id, institution, qualification_type, degree_diploma, field_of_study, start_date, end_date, grade_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, institution, qualification_type, degree_diploma, field_of_study, start_date, end_date, grade_score, created_at, created_at as updated_at`, [
            userProfileId,
            educationData.institution,
            educationData.qualification_type,
            educationData.degree_diploma,
            educationData.field_of_study,
            educationData.start_date,
            educationData.end_date,
            educationData.grade_score
        ]);
        const newRecord = profile_1.EducationRecordDTO.parse(result.rows[0]);
        res.status(201).json(newRecord);
    }
    catch (error) {
        console.error('Error creating education record:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Update an education record
router.put('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const recordId = req.params.id;
        const educationData = profile_1.EducationRecordDTO.parse(req.body);
        // Verify the record belongs to the user and update it
        const result = yield db_1.db.query(`UPDATE education_records 
       SET institution = $1, qualification_type = $2, degree_diploma = $3, 
           field_of_study = $4, start_date = $5, end_date = $6, grade_score = $7
       FROM user_profiles up
       WHERE education_records.id = $8 AND education_records.user_profile_id = up.id AND up.user_id = $9
       RETURNING education_records.id, institution, qualification_type, degree_diploma, field_of_study,
                 start_date, end_date, grade_score, education_records.created_at, education_records.created_at as updated_at`, [
            educationData.institution,
            educationData.qualification_type,
            educationData.degree_diploma,
            educationData.field_of_study,
            educationData.start_date,
            educationData.end_date,
            educationData.grade_score,
            recordId,
            userId
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Education record not found' });
        }
        const updatedRecord = profile_1.EducationRecordDTO.parse(result.rows[0]);
        res.status(200).json(updatedRecord);
    }
    catch (error) {
        console.error('Error updating education record:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete an education record
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const recordId = req.params.id;
        // Verify the record belongs to the user and delete it
        const result = yield db_1.db.query(`DELETE FROM education_records 
       USING user_profiles up
       WHERE education_records.id = $1 AND education_records.user_profile_id = up.id AND up.user_id = $2
       RETURNING education_records.id`, [recordId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Education record not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting education record:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
