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
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const jobRecommendationService_js_1 = require("../services/jobRecommendationService.js");
const router = (0, express_1.Router)();
// Validation schema for recommendation request
const RecommendationRequestSchema = zod_1.z.object({
    limit: zod_1.z.number().min(1).max(50).default(10),
    keywords: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    minSalary: zod_1.z.number().optional(),
    maxSalary: zod_1.z.number().optional(),
    jobType: zod_1.z.string().optional(),
    includeApplied: zod_1.z.boolean().default(false)
});
// Get job recommendations for the authenticated user
router.get('/', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const validatedQuery = RecommendationRequestSchema.parse(req.query);
        // Convert query string numbers to actual numbers
        const filters = Object.assign(Object.assign({}, validatedQuery), { limit: Number(validatedQuery.limit) || 10, minSalary: validatedQuery.minSalary ? Number(validatedQuery.minSalary) : undefined, maxSalary: validatedQuery.maxSalary ? Number(validatedQuery.maxSalary) : undefined, includeApplied: validatedQuery.includeApplied === true });
        const recommendations = yield jobRecommendationService_js_1.JobRecommendationService.getPersonalizedRecommendations({
            userId,
            limit: Number(validatedQuery.limit) || 10,
            excludeApplied: !validatedQuery.includeApplied
        });
        res.json({
            recommendations,
            count: recommendations.length,
            message: 'Job recommendations retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting job recommendations:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.issues
            });
        }
        res.status(500).json({ error: 'Failed to get job recommendations' });
    }
}));
// Get detailed recommendation explanation for a specific job
router.get('/explain/:jobId', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;
        // For now, return a placeholder response since the method doesn't exist
        // This would need to be implemented in JobRecommendationService
        res.json({
            explanation: {
                jobId,
                matchReasons: ['Profile skills match', 'Location preference', 'Salary range'],
                matchScore: 0.85,
                message: 'This job matches your profile based on skills and preferences'
            },
            message: 'Recommendation explanation retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error explaining recommendation:', error);
        res.status(500).json({ error: 'Failed to explain recommendation' });
    }
}));
// Update user feedback on a recommendation
router.post('/:jobId/feedback', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { jobId } = req.params;
        const { feedback, rating } = req.body;
        // Validate feedback
        if (!['interested', 'not_interested', 'applied', 'irrelevant'].includes(feedback)) {
            return res.status(400).json({
                error: 'Invalid feedback. Must be one of: interested, not_interested, applied, irrelevant'
            });
        }
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            return res.status(400).json({
                error: 'Rating must be between 1 and 5'
            });
        }
        yield jobRecommendationService_js_1.JobRecommendationService.recordRecommendationFeedback(userId, jobId, feedback, rating);
        res.json({
            message: 'Feedback recorded successfully'
        });
    }
    catch (error) {
        console.error('Error recording feedback:', error);
        res.status(500).json({ error: 'Failed to record feedback' });
    }
}));
// Get user's recommendation statistics
router.get('/stats', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const stats = yield jobRecommendationService_js_1.JobRecommendationService.getRecommendationAnalytics(userId);
        res.json({
            stats,
            message: 'Recommendation statistics retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting recommendation stats:', error);
        res.status(500).json({ error: 'Failed to get recommendation statistics' });
    }
}));
exports.default = router;
