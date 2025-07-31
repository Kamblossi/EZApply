import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { UserSkillDTO } from '../validators/profile';
import { z } from 'zod';

const router = Router();

// Get all user skills for the authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    // Get user's profile ID first
    const profileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    const userProfileId = profileResult.rows[0].id;

    // Get all user skills
    const result = await db.query(
      `SELECT id, skill_name, proficiency_level, category, 
              NOW() as created_at, NOW() as updated_at
       FROM user_skills 
       WHERE user_profile_id = $1 
       ORDER BY skill_name ASC`,
      [userProfileId]
    );

    const validatedSkills = z.array(UserSkillDTO).parse(result.rows);
    res.status(200).json({ data: validatedSkills });

  } catch (error: any) {
    console.error('Error fetching user skills:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific user skill
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const skillId = req.params.id;

    // Verify the skill belongs to the user
    const result = await db.query(
      `SELECT us.id, us.skill_name, us.proficiency_level, us.category,
              NOW() as created_at, NOW() as updated_at
       FROM user_skills us
       JOIN user_profiles up ON us.user_profile_id = up.id
       WHERE us.id = $1 AND up.user_id = $2`,
      [skillId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User skill not found' });
    }

    const validatedSkill = UserSkillDTO.parse(result.rows[0]);
    res.status(200).json(validatedSkill);

  } catch (error: any) {
    console.error('Error fetching user skill:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new user skill
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const skillData = UserSkillDTO.parse(req.body);

    // Get user's profile ID
    const profileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
    }

    const userProfileId = profileResult.rows[0].id;

    // Insert the new user skill
    const result = await db.query(
      `INSERT INTO user_skills 
       (user_profile_id, skill_name, proficiency_level, category)
       VALUES ($1, $2, $3, $4)
       RETURNING id, skill_name, proficiency_level, category, NOW() as created_at, NOW() as updated_at`,
      [
        userProfileId,
        skillData.skill_name,
        skillData.proficiency_level,
        skillData.category
      ]
    );

    const newSkill = UserSkillDTO.parse(result.rows[0]);
    res.status(201).json(newSkill);

  } catch (error: any) {
    console.error('Error creating user skill:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a user skill
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const skillId = req.params.id;
    const skillData = UserSkillDTO.parse(req.body);

    // Verify the skill belongs to the user and update it
    const result = await db.query(
      `UPDATE user_skills 
       SET skill_name = $1, proficiency_level = $2, category = $3
       FROM user_profiles up
       WHERE user_skills.id = $4 AND user_skills.user_profile_id = up.id AND up.user_id = $5
       RETURNING user_skills.id, skill_name, proficiency_level, category,
                 NOW() as created_at, NOW() as updated_at`,
      [
        skillData.skill_name,
        skillData.proficiency_level,
        skillData.category,
        skillId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User skill not found' });
    }

    const updatedSkill = UserSkillDTO.parse(result.rows[0]);
    res.status(200).json(updatedSkill);

  } catch (error: any) {
    console.error('Error updating user skill:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a user skill
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const skillId = req.params.id;

    // Verify the skill belongs to the user and delete it
    const result = await db.query(
      `DELETE FROM user_skills 
       USING user_profiles up
       WHERE user_skills.id = $1 AND user_skills.user_profile_id = up.id AND up.user_id = $2
       RETURNING user_skills.id`,
      [skillId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User skill not found' });
    }

    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting user skill:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as skillsRouter };
