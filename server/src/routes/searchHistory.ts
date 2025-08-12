import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../db.js';

const router = Router();

// Validation schema for search history entry
const SearchHistorySchema = z.object({
  query: z.string().min(1),
  filters: z.record(z.string(), z.any()).optional(),
  results_count: z.number().min(0).optional(),
  platform: z.string().optional()
});

// Record a new search in history
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const validatedData = SearchHistorySchema.parse(req.body);

    const result = await db.query(
      `INSERT INTO search_analytics (
        user_id, search_query, search_filters, results_count, 
        platform, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, search_query, results_count, created_at`,
      [
        userId,
        validatedData.query,
        JSON.stringify(validatedData.filters || {}),
        validatedData.results_count || 0,
        validatedData.platform || 'web'
      ]
    );

    res.status(201).json({
      message: 'Search recorded successfully',
      search: result.rows[0]
    });
  } catch (error) {
    console.error('Error recording search:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }
    res.status(500).json({ error: 'Failed to record search' });
  }
});

// Get user's search history
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await db.query(
      `SELECT 
        id, search_query, search_filters, results_count, 
        platform, created_at
      FROM search_analytics 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await db.query(
      'SELECT COUNT(*) as total FROM search_analytics WHERE user_id = $1',
      [userId]
    );

    res.json({
      searches: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
        has_more: parseInt(countResult.rows[0].total) > offset + limit
      }
    });
  } catch (error) {
    console.error('Error getting search history:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

// Get popular search terms
router.get('/popular', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

    const result = await db.query(
      `SELECT 
        search_query,
        COUNT(*) as frequency,
        MAX(created_at) as last_searched,
        AVG(results_count) as avg_results
      FROM search_analytics 
      WHERE user_id = $1 AND search_query IS NOT NULL
      GROUP BY search_query
      ORDER BY frequency DESC, last_searched DESC
      LIMIT $2`,
      [userId, limit]
    );

    res.json({
      popular_searches: result.rows,
      message: 'Popular searches retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting popular searches:', error);
    res.status(500).json({ error: 'Failed to get popular searches' });
  }
});

// Get search analytics and insights
router.get('/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const days = Math.min(parseInt(req.query.days as string) || 30, 365);

    // Get search frequency over time
    const frequencyResult = await db.query(
      `SELECT 
        DATE(created_at) as search_date,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results
      FROM search_analytics 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY search_date DESC`,
      [userId]
    );

    // Get platform usage
    const platformResult = await db.query(
      `SELECT 
        platform,
        COUNT(*) as usage_count,
        AVG(results_count) as avg_results
      FROM search_analytics 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY platform
      ORDER BY usage_count DESC`,
      [userId]
    );

    // Get overall stats
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_searches,
        COUNT(DISTINCT search_query) as unique_queries,
        AVG(results_count) as avg_results_per_search,
        MAX(created_at) as last_search
      FROM search_analytics 
      WHERE user_id = $1 
        AND created_at >= NOW() - INTERVAL '${days} days'`,
      [userId]
    );

    res.json({
      analytics: {
        daily_frequency: frequencyResult.rows,
        platform_usage: platformResult.rows,
        overall_stats: statsResult.rows[0]
      },
      period_days: days,
      message: 'Search analytics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting search analytics:', error);
    res.status(500).json({ error: 'Failed to get search analytics' });
  }
});

// Clear search history
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { days } = req.query;

    let query = 'DELETE FROM search_analytics WHERE user_id = $1';
    const params = [userId];

    if (days) {
      query += ` AND created_at <= NOW() - INTERVAL '${parseInt(days as string)} days'`;
    }

    const result = await db.query(query, params);

    res.json({
      message: 'Search history cleared successfully',
      deleted_count: result.rowCount
    });
  } catch (error) {
    console.error('Error clearing search history:', error);
    res.status(500).json({ error: 'Failed to clear search history' });
  }
});

// Delete specific search entry
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM search_analytics WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Search entry not found' });
    }

    res.json({
      message: 'Search entry deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting search entry:', error);
    res.status(500).json({ error: 'Failed to delete search entry' });
  }
});

export default router;
