import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { EmploymentRecordDTO } from '../validators/profile';
import { z } from 'zod';

const router = Router();

// Get all employment records for the authenticated user
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

    // Get all employment records
    const result = await db.query(
      `SELECT id, employer, position, start_date, end_date, responsibilities, 
              reason_for_leaving, salary_information, created_at, created_at as updated_at
       FROM employment_records 
       WHERE user_profile_id = $1 
       ORDER BY start_date DESC`,
      [userProfileId]
    );

    const validatedRecords = z.array(EmploymentRecordDTO).parse(result.rows);
    res.status(200).json({ data: validatedRecords });

  } catch (error: any) {
    console.error('Error fetching employment records:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific employment record
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const recordId = req.params.id;

    // Verify the record belongs to the user
    const result = await db.query(
      `SELECT er.id, er.employer, er.position, er.start_date, er.end_date, 
              er.responsibilities, er.reason_for_leaving, er.salary_information,
              er.created_at, er.created_at as updated_at
       FROM employment_records er
       JOIN user_profiles up ON er.user_profile_id = up.id
       WHERE er.id = $1 AND up.user_id = $2`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employment record not found' });
    }

    const validatedRecord = EmploymentRecordDTO.parse(result.rows[0]);
    res.status(200).json(validatedRecord);

  } catch (error: any) {
    console.error('Error fetching employment record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new employment record
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const employmentData = EmploymentRecordDTO.parse(req.body);

    // Get user's profile ID
    const profileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
    }

    const userProfileId = profileResult.rows[0].id;

    // Insert the new employment record
    const result = await db.query(
      `INSERT INTO employment_records 
       (user_profile_id, employer, position, start_date, end_date, responsibilities, reason_for_leaving, salary_information)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, employer, position, start_date, end_date, responsibilities, reason_for_leaving, salary_information, created_at, created_at as updated_at`,
      [
        userProfileId,
        employmentData.employer,
        employmentData.position,
        employmentData.start_date,
        employmentData.end_date,
        employmentData.responsibilities,
        employmentData.reason_for_leaving,
        employmentData.salary_information
      ]
    );

    const newRecord = EmploymentRecordDTO.parse(result.rows[0]);
    res.status(201).json(newRecord);

  } catch (error: any) {
    console.error('Error creating employment record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an employment record
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const recordId = req.params.id;
    const employmentData = EmploymentRecordDTO.parse(req.body);

    // Verify the record belongs to the user and update it
    const result = await db.query(
      `UPDATE employment_records 
       SET employer = $1, position = $2, start_date = $3, end_date = $4, 
           responsibilities = $5, reason_for_leaving = $6, salary_information = $7
       FROM user_profiles up
       WHERE employment_records.id = $8 AND employment_records.user_profile_id = up.id AND up.user_id = $9
       RETURNING employment_records.id, employer, position, start_date, end_date, 
                 responsibilities, reason_for_leaving, salary_information, 
                 employment_records.created_at, employment_records.created_at as updated_at`,
      [
        employmentData.employer,
        employmentData.position,
        employmentData.start_date,
        employmentData.end_date,
        employmentData.responsibilities,
        employmentData.reason_for_leaving,
        employmentData.salary_information,
        recordId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employment record not found' });
    }

    const updatedRecord = EmploymentRecordDTO.parse(result.rows[0]);
    res.status(200).json(updatedRecord);

  } catch (error: any) {
    console.error('Error updating employment record:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete an employment record
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const recordId = req.params.id;

    // Verify the record belongs to the user and delete it
    const result = await db.query(
      `DELETE FROM employment_records 
       USING user_profiles up
       WHERE employment_records.id = $1 AND employment_records.user_profile_id = up.id AND up.user_id = $2
       RETURNING employment_records.id`,
      [recordId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employment record not found' });
    }

    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting employment record:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as employmentRouter };
