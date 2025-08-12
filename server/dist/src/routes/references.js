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
exports.referencesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const profile_1 = require("../validators/profile");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
exports.referencesRouter = router;
// Get all reference contacts for the authenticated user
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
        // Get all reference contacts
        const result = yield db_1.db.query(`SELECT id, name, relationship, company, phone, email, 
              position, created_at, created_at as updated_at
       FROM reference_contacts 
       WHERE user_profile_id = $1 
       ORDER BY name ASC`, [userProfileId]);
        const validatedContacts = zod_1.z.array(profile_1.ReferenceContactDTO).parse(result.rows);
        res.status(200).json({ data: validatedContacts });
    }
    catch (error) {
        console.error('Error fetching reference contacts:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Get a specific reference contact
router.get('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const contactId = req.params.id;
        // Verify the contact belongs to the user
        const result = yield db_1.db.query(`SELECT rc.id, rc.name, rc.relationship, rc.company, rc.phone, 
              rc.email, rc.position, rc.created_at, rc.created_at as updated_at
       FROM reference_contacts rc
       JOIN user_profiles up ON rc.user_profile_id = up.id
       WHERE rc.id = $1 AND up.user_id = $2`, [contactId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reference contact not found' });
        }
        const validatedContact = profile_1.ReferenceContactDTO.parse(result.rows[0]);
        res.status(200).json(validatedContact);
    }
    catch (error) {
        console.error('Error fetching reference contact:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Create a new reference contact
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const contactData = profile_1.ReferenceContactDTO.parse(req.body);
        // Get user's profile ID
        const profileResult = yield db_1.db.query('SELECT id FROM user_profiles WHERE user_id = $1', [userId]);
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
        }
        const userProfileId = profileResult.rows[0].id;
        // Insert the new reference contact
        const result = yield db_1.db.query(`INSERT INTO reference_contacts 
       (user_profile_id, name, relationship, company, phone, email, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, relationship, company, phone, email, position, created_at, created_at as updated_at`, [
            userProfileId,
            contactData.name,
            contactData.relationship,
            contactData.company,
            contactData.phone,
            contactData.email,
            contactData.position
        ]);
        const newContact = profile_1.ReferenceContactDTO.parse(result.rows[0]);
        res.status(201).json(newContact);
    }
    catch (error) {
        console.error('Error creating reference contact:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Update a reference contact
router.put('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const contactId = req.params.id;
        const contactData = profile_1.ReferenceContactDTO.parse(req.body);
        // Verify the contact belongs to the user and update it
        const result = yield db_1.db.query(`UPDATE reference_contacts 
       SET name = $1, relationship = $2, company = $3, phone = $4, 
           email = $5, position = $6
       FROM user_profiles up
       WHERE reference_contacts.id = $7 AND reference_contacts.user_profile_id = up.id AND up.user_id = $8
       RETURNING reference_contacts.id, name, relationship, company, phone, email, position,
                 reference_contacts.created_at, reference_contacts.created_at as updated_at`, [
            contactData.name,
            contactData.relationship,
            contactData.company,
            contactData.phone,
            contactData.email,
            contactData.position,
            contactId,
            userId
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reference contact not found' });
        }
        const updatedContact = profile_1.ReferenceContactDTO.parse(result.rows[0]);
        res.status(200).json(updatedContact);
    }
    catch (error) {
        console.error('Error updating reference contact:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
// Delete a reference contact
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const contactId = req.params.id;
        // Verify the contact belongs to the user and delete it
        const result = yield db_1.db.query(`DELETE FROM reference_contacts 
       USING user_profiles up
       WHERE reference_contacts.id = $1 AND reference_contacts.user_profile_id = up.id AND up.user_id = $2
       RETURNING reference_contacts.id`, [contactId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reference contact not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting reference contact:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}));
