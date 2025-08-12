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
exports.employmentRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const profile_1 = require("../validators/profile");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.employmentRouter = router;
// Get all employment records for the authenticated user
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
        // Get all employment records
        const result = yield db_1.db.query(`SELECT id, employer, position, start_date, end_date, responsibilities, 
              reason_for_leaving, salary_information, created_at, created_at as updated_at
       FROM employment_records 
       WHERE user_profile_id = $1 
       ORDER BY start_date DESC`, [userProfileId]);
        const validatedRecords = zod_1.z.array(profile_1.EmploymentRecordDTO).parse(result.rows);
        res.status(200).json({ data: validatedRecords });
    }
    catch (error) {
        console.error('Error fetching employment records:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get a specific employment record
router.get('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const recordId = req.params.id;
        // Verify the record belongs to the user
        const result = yield db_1.db.query(`SELECT er.id, er.employer, er.position, er.start_date, er.end_date, 
              er.responsibilities, er.reason_for_leaving, er.salary_information,
              er.created_at, er.created_at as updated_at
       FROM employment_records er
       JOIN user_profiles up ON er.user_profile_id = up.id
       WHERE er.id = $1 AND up.user_id = $2`, [recordId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employment record not found' });
        }
        const validatedRecord = profile_1.EmploymentRecordDTO.parse(result.rows[0]);
        res.status(200).json(validatedRecord);
    }
    catch (error) {
        console.error('Error fetching employment record:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Create a new employment record
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const employmentData = profile_1.EmploymentRecordDTO.parse(req.body);
        // Get user's profile ID
        const profileResult = yield db_1.db.query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
        }
        const userProfileId = profileResult.rows[0].id;
        // Insert the new employment record
        const result = yield db_1.db.query(`INSERT INTO employment_records 
       (user_profile_id, employer, position, start_date, end_date, responsibilities, reason_for_leaving, salary_information)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, employer, position, start_date, end_date, responsibilities, reason_for_leaving, salary_information, created_at, created_at as updated_at`, [
            userProfileId,
            employmentData.employer,
            employmentData.position,
            employmentData.start_date,
            employmentData.end_date,
            employmentData.responsibilities,
            employmentData.reason_for_leaving,
            employmentData.salary_information
        ]);
        const newRecord = profile_1.EmploymentRecordDTO.parse(result.rows[0]);
        res.status(201).json(newRecord);
    }
    catch (error) {
        console.error('Error creating employment record:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Update an employment record
router.put('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const recordId = req.params.id;
        const employmentData = profile_1.EmploymentRecordDTO.parse(req.body);
        // Verify the record belongs to the user and update it
        const result = yield db_1.db.query(`UPDATE employment_records 
       SET employer = $1, position = $2, start_date = $3, end_date = $4, 
           responsibilities = $5, reason_for_leaving = $6, salary_information = $7
       FROM user_profiles up
       WHERE employment_records.id = $8 AND employment_records.user_profile_id = up.id AND up.user_id = $9
       RETURNING employment_records.id, employer, position, start_date, end_date, 
                 responsibilities, reason_for_leaving, salary_information, 
                 employment_records.created_at, employment_records.created_at as updated_at`, [
            employmentData.employer,
            employmentData.position,
            employmentData.start_date,
            employmentData.end_date,
            employmentData.responsibilities,
            employmentData.reason_for_leaving,
            employmentData.salary_information,
            recordId,
            userId
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employment record not found' });
        }
        const updatedRecord = profile_1.EmploymentRecordDTO.parse(result.rows[0]);
        res.status(200).json(updatedRecord);
    }
    catch (error) {
        console.error('Error updating employment record:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete an employment record
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const recordId = req.params.id;
        // Verify the record belongs to the user and delete it
        const result = yield db_1.db.query(`DELETE FROM employment_records 
       USING user_profiles up
       WHERE employment_records.id = $1 AND employment_records.user_profile_id = up.id AND up.user_id = $2
       RETURNING employment_records.id`, [recordId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Employment record not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting employment record:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
