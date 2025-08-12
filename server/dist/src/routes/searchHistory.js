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
const db_js_1 = require("../db.js");
const router = (0, express_1.Router)();
// Validation schema for search history entry
const SearchHistorySchema = zod_1.z.object({
    query: zod_1.z.string().min(1),
    filters: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    results_count: zod_1.z.number().min(0).optional(),
    platform: zod_1.z.string().optional()
});
// Record a new search in history
router.post('/', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const validatedData = SearchHistorySchema.parse(req.body);
        const result = yield db_js_1.db.query(`INSERT INTO search_analytics (
        user_id, search_query, search_filters, results_count, 
        platform, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, search_query, results_count, created_at`, [
            userId,
            validatedData.query,
            JSON.stringify(validatedData.filters || {}),
            validatedData.results_count || 0,
            validatedData.platform || 'web'
        ]);
        res.status(201).json({
            message: 'Search recorded successfully',
            search: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error recording search:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.issues
            });
        }
        res.status(500).json({ error: 'Failed to record search' });
    }
}));
// Get user's search history
router.get('/', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        const result = yield db_js_1.db.query(`SELECT 
        id, search_query, search_filters, results_count, 
        platform, created_at
      FROM search_analytics 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        // Get total count for pagination
        const countResult = yield db_js_1.db.query('SELECT COUNT(*) as total FROM search_analytics WHERE user_id = $1', [userId]);
        res.json({
            searches: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit,
                offset,
                has_more: parseInt(countResult.rows[0].total) > offset + limit
            }
        });
    }
    catch (error) {
        console.error('Error getting search history:', error);
        res.status(500).json({ error: 'Failed to get search history' });
    }
}));
// Get popular search terms
router.get('/popular', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 10, 20);
        const result = yield db_js_1.db.query(`SELECT 
        search_query,
        COUNT(*) as frequency,
        MAX(created_at) as last_searched,
        AVG(results_count) as avg_results
      FROM search_analytics 
      WHERE user_id = $1 AND search_query IS NOT NULL
      GROUP BY search_query
      ORDER BY frequency DESC, last_searched DESC
      LIMIT $2`, [userId, limit]);
        res.json({
            popular_searches: result.rows,
            message: 'Popular searches retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting popular searches:', error);
        res.status(500).json({ error: 'Failed to get popular searches' });
    }
}));
// Get search analytics and insights
router.get('/analytics', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const days = Math.min(parseInt(req.query.days) || 30, 365);
        // Get search frequency over time
        const frequencyResult = yield db_js_1.db.query(`SELECT 
        DATE(created_at) as search_date,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results
      FROM search_analytics 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY search_date DESC`, [userId]);
        // Get platform usage
        const platformResult = yield db_js_1.db.query(`SELECT 
        platform,
        COUNT(*) as usage_count,
        AVG(results_count) as avg_results
      FROM search_analytics 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY platform
      ORDER BY usage_count DESC`, [userId]);
        // Get overall stats
        const statsResult = yield db_js_1.db.query(`SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT search_query) as unique_queries,
        AVG(results_count) as avg_results_per_search,
        MAX(created_at) as last_search
      FROM search_analytics 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'`, [userId]);
        res.json({
            analytics: {
                daily_frequency: frequencyResult.rows,
                platform_usage: platformResult.rows,
                overall_stats: statsResult.rows[0]
            },
            period_days: days,
            message: 'Search analytics retrieved successfully'
        });
    }
    catch (error) {
        console.error('Error getting search analytics:', error);
        res.status(500).json({ error: 'Failed to get search analytics' });
    }
}));
// Clear search history
router.delete('/', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { days } = req.query;
        let query = 'DELETE FROM search_analytics WHERE user_id = $1';
        const params = [userId];
        if (days) {
            query += ` AND created_at <= NOW() - INTERVAL '${parseInt(days)} days'`;
        }
        const result = yield db_js_1.db.query(query, params);
        res.json({
            message: 'Search history cleared successfully',
            deleted_count: result.rowCount
        });
    }
    catch (error) {
        console.error('Error clearing search history:', error);
        res.status(500).json({ error: 'Failed to clear search history' });
    }
}));
// Delete specific search entry
router.delete('/:id', auth_js_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const result = yield db_js_1.db.query('DELETE FROM search_analytics WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Search entry not found' });
        }
        res.json({
            message: 'Search entry deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting search entry:', error);
        res.status(500).json({ error: 'Failed to delete search entry' });
    }
}));
exports.default = router;
