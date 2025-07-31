import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { EducationRecordDTO } from '../validators/profile';
import { z } from 'zod';

const router = Router();

// Get all education records for the authenticated user
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

    // Get all education records
    const result = await db.query(
      `SELECT id, institution, qualification_type, degree_diploma, field_of_study, 
              start_date, end_date, grade_score, created_at, created_at as updated_at
       FROM education_records 
       WHERE user_profile_id = $1 
       ORDER BY start_date DESC`,
      [userProfileId]
    );

    const validatedRecords = z.array(EducationRecordDTO).parse(result.rows);
    res.status(200).json({ data: validatedRecords });

  } catch (error: any) {
    console.error('Error fetching education records:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific education record
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const recordId = req.params.id;

    // Verify the record belongs to the user
    const result = await db.query(
      `SELECT er.id, er.institution, er.qualification_type, er.degree_diploma, 
              er.field_of_study, er.start_date, er.end_date, er.grade_score,
              er.created_at, er.created_at as updated_at
       FROM education_records er
       JOIN user_profiles up ON er.user_profile_id = up.id
       WHERE er.id = $1 AND up.user_id = $2`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Education record not found' });
    }

    const validatedRecord = EducationRecordDTO.parse(result.rows[0]);
    res.status(200).json(validatedRecord);

  } catch (error: any) {
    console.error('Error fetching education record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new education record
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const educationData = EducationRecordDTO.parse(req.body);

    // Get user's profile ID
    const profileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
    }

    const userProfileId = profileResult.rows[0].id;

    // Insert the new education record
    const result = await db.query(
      `INSERT INTO education_records 
       (user_profile_id, institution, qualification_type, degree_diploma, field_of_study, start_date, end_date, grade_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, institution, qualification_type, degree_diploma, field_of_study, start_date, end_date, grade_score, created_at, created_at as updated_at`,
      [
        userProfileId,
        educationData.institution,
        educationData.qualification_type,
        educationData.degree_diploma,
        educationData.field_of_study,
        educationData.start_date,
        educationData.end_date,
        educationData.grade_score
      ]
    );

    const newRecord = EducationRecordDTO.parse(result.rows[0]);
    res.status(201).json(newRecord);

  } catch (error: any) {
    console.error('Error creating education record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an education record
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const recordId = req.params.id;
    const educationData = EducationRecordDTO.parse(req.body);

    // Verify the record belongs to the user and update it
    const result = await db.query(
      `UPDATE education_records 
       SET institution = $1, qualification_type = $2, degree_diploma = $3, 
           field_of_study = $4, start_date = $5, end_date = $6, grade_score = $7
       FROM user_profiles up
       WHERE education_records.id = $8 AND education_records.user_profile_id = up.id AND up.user_id = $9
       RETURNING education_records.id, institution, qualification_type, degree_diploma, field_of_study,
                 start_date, end_date, grade_score, education_records.created_at, education_records.created_at as updated_at`,
      [
        educationData.institution,
        educationData.qualification_type,
        educationData.degree_diploma,
        educationData.field_of_study,
        educationData.start_date,
        educationData.end_date,
        educationData.grade_score,
        recordId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Education record not found' });
    }

    const updatedRecord = EducationRecordDTO.parse(result.rows[0]);
    res.status(200).json(updatedRecord);

  } catch (error: any) {
    console.error('Error updating education record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete an education record
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const recordId = req.params.id;

    // Verify the record belongs to the user and delete it
    const result = await db.query(
      `DELETE FROM education_records 
       USING user_profiles up
       WHERE education_records.id = $1 AND education_records.user_profile_id = up.id AND up.user_id = $2
       RETURNING education_records.id`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Education record not found' });
    }

    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting education record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as educationRouter };
