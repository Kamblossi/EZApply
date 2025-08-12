import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { JobRecommendationService } from '../services/jobRecommendationService.js';

const router = Router();

// Validation schema for recommendation request
const RecommendationRequestSchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  keywords: z.string().optional(),
  location: z.string().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  jobType: z.string().optional(),
  includeApplied: z.boolean().default(false)
});

// Get job recommendations for the authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const validatedQuery = RecommendationRequestSchema.parse(req.query);

    // Convert query string numbers to actual numbers
    const filters = {
      ...validatedQuery,
      limit: Number(validatedQuery.limit) || 10,
      minSalary: validatedQuery.minSalary ? Number(validatedQuery.minSalary) : undefined,
      maxSalary: validatedQuery.maxSalary ? Number(validatedQuery.maxSalary) : undefined,
      includeApplied: validatedQuery.includeApplied === true
    };

    const recommendations = await JobRecommendationService.getPersonalizedRecommendations({
      userId,
      limit: Number(validatedQuery.limit) || 10,
      excludeApplied: !validatedQuery.includeApplied
    });

    res.json({
      recommendations,
      count: recommendations.length,
      message: 'Job recommendations retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting job recommendations:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }
    res.status(500).json({ error: 'Failed to get job recommendations' });
  }
});

// Get detailed recommendation explanation for a specific job
router.get('/explain/:jobId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
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
  } catch (error) {
    console.error('Error explaining recommendation:', error);
    res.status(500).json({ error: 'Failed to explain recommendation' });
  }
});

// Update user feedback on a recommendation
router.post('/:jobId/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
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

    await JobRecommendationService.recordRecommendationFeedback(userId, jobId, feedback, rating);

    res.json({
      message: 'Feedback recorded successfully'
    });
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get user's recommendation statistics
router.get('/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const stats = await JobRecommendationService.getRecommendationAnalytics(userId);

    res.json({
      stats,
      message: 'Recommendation statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting recommendation stats:', error);
    res.status(500).json({ error: 'Failed to get recommendation statistics' });
  }
});

export default router;
