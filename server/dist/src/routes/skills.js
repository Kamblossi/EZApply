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
exports.skillsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const profile_1 = require("../validators/profile");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.skillsRouter = router;
// Get all user skills for the authenticated user
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
        // Get all user skills
        const result = yield db_1.db.query(`SELECT id, skill_name, proficiency_level, category, 
              NOW() as created_at, NOW() as updated_at
       FROM user_skills 
       WHERE user_profile_id = $1 
       ORDER BY skill_name ASC`, [userProfileId]);
        const validatedSkills = zod_1.z.array(profile_1.UserSkillDTO).parse(result.rows);
        res.status(200).json({ data: validatedSkills });
    }
    catch (error) {
        console.error('Error fetching user skills:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get a specific user skill
router.get('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const skillId = req.params.id;
        // Verify the skill belongs to the user
        const result = yield db_1.db.query(`SELECT us.id, us.skill_name, us.proficiency_level, us.category,
              NOW() as created_at, NOW() as updated_at
       FROM user_skills us
       JOIN user_profiles up ON us.user_profile_id = up.id
       WHERE us.id = $1 AND up.user_id = $2`, [skillId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User skill not found' });
        }
        const validatedSkill = profile_1.UserSkillDTO.parse(result.rows[0]);
        res.status(200).json(validatedSkill);
    }
    catch (error) {
        console.error('Error fetching user skill:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Create a new user skill
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const skillData = profile_1.UserSkillDTO.parse(req.body);
        // Get user's profile ID
        const profileResult = yield db_1.db.query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
        }
        const userProfileId = profileResult.rows[0].id;
        // Insert the new user skill
        const result = yield db_1.db.query(`INSERT INTO user_skills 
       (user_profile_id, skill_name, proficiency_level, category)
       VALUES ($1, $2, $3, $4)
       RETURNING id, skill_name, proficiency_level, category, NOW() as created_at, NOW() as updated_at`, [
            userProfileId,
            skillData.skill_name,
            skillData.proficiency_level,
            skillData.category
        ]);
        const newSkill = profile_1.UserSkillDTO.parse(result.rows[0]);
        res.status(201).json(newSkill);
    }
    catch (error) {
        console.error('Error creating user skill:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Update a user skill
router.put('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const skillId = req.params.id;
        const skillData = profile_1.UserSkillDTO.parse(req.body);
        // Verify the skill belongs to the user and update it
        const result = yield db_1.db.query(`UPDATE user_skills 
       SET skill_name = $1, proficiency_level = $2, category = $3
       FROM user_profiles up
       WHERE user_skills.id = $4 AND user_skills.user_profile_id = up.id AND up.user_id = $5
       RETURNING user_skills.id, skill_name, proficiency_level, category,
                 NOW() as created_at, NOW() as updated_at`, [
            skillData.skill_name,
            skillData.proficiency_level,
            skillData.category,
            skillId,
            userId
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User skill not found' });
        }
        const updatedSkill = profile_1.UserSkillDTO.parse(result.rows[0]);
        res.status(200).json(updatedSkill);
    }
    catch (error) {
        console.error('Error updating user skill:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete a user skill
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const skillId = req.params.id;
        // Verify the skill belongs to the user and delete it
        const result = yield db_1.db.query(`DELETE FROM user_skills 
       USING user_profiles up
       WHERE user_skills.id = $1 AND user_skills.user_profile_id = up.id AND up.user_id = $2
       RETURNING user_skills.id`, [skillId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User skill not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting user skill:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
