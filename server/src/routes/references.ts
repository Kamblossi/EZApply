import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { ReferenceContactDTO } from '../validators/profile';
import { z } from 'zod';

const router = Router();

// Get all reference contacts for the authenticated user
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

    // Get all reference contacts
    const result = await db.query(
      `SELECT id, name, relationship, company, phone, email, 
              position, created_at, created_at as updated_at
       FROM reference_contacts 
       WHERE user_profile_id = $1 
       ORDER BY name ASC`,
      [userProfileId]
    );

    const validatedContacts = z.array(ReferenceContactDTO).parse(result.rows);
    res.status(200).json({ data: validatedContacts });

  } catch (error: any) {
    console.error('Error fetching reference contacts:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific reference contact
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const contactId = req.params.id;

    // Verify the contact belongs to the user
    const result = await db.query(
      `SELECT rc.id, rc.name, rc.relationship, rc.company, rc.phone, 
              rc.email, rc.position, rc.created_at, rc.created_at as updated_at
       FROM reference_contacts rc
       JOIN user_profiles up ON rc.user_profile_id = up.id
       WHERE rc.id = $1 AND up.user_id = $2`,
      [contactId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reference contact not found' });
    }

    const validatedContact = ReferenceContactDTO.parse(result.rows[0]);
    res.status(200).json(validatedContact);

  } catch (error: any) {
    console.error('Error fetching reference contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new reference contact
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const contactData = ReferenceContactDTO.parse(req.body);

    // Get user's profile ID
    const profileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
    }

    const userProfileId = profileResult.rows[0].id;

    // Insert the new reference contact
    const result = await db.query(
      `INSERT INTO reference_contacts 
       (user_profile_id, name, relationship, company, phone, email, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, relationship, company, phone, email, position, created_at, created_at as updated_at`,
      [
        userProfileId,
        contactData.name,
        contactData.relationship,
        contactData.company,
        contactData.phone,
        contactData.email,
        contactData.position
      ]
    );

    const newContact = ReferenceContactDTO.parse(result.rows[0]);
    res.status(201).json(newContact);

  } catch (error: any) {
    console.error('Error creating reference contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a reference contact
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const contactId = req.params.id;
    const contactData = ReferenceContactDTO.parse(req.body);

    // Verify the contact belongs to the user and update it
    const result = await db.query(
      `UPDATE reference_contacts 
       SET name = $1, relationship = $2, company = $3, phone = $4, 
           email = $5, position = $6
       FROM user_profiles up
       WHERE reference_contacts.id = $7 AND reference_contacts.user_profile_id = up.id AND up.user_id = $8
       RETURNING reference_contacts.id, name, relationship, company, phone, email, position,
                 reference_contacts.created_at, reference_contacts.created_at as updated_at`,
      [
        contactData.name,
        contactData.relationship,
        contactData.company,
        contactData.phone,
        contactData.email,
        contactData.position,
        contactId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reference contact not found' });
    }

    const updatedContact = ReferenceContactDTO.parse(result.rows[0]);
    res.status(200).json(updatedContact);

  } catch (error: any) {
    console.error('Error updating reference contact:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a reference contact
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const contactId = req.params.id;

    // Verify the contact belongs to the user and delete it
    const result = await db.query(
      `DELETE FROM reference_contacts 
       USING user_profiles up
       WHERE reference_contacts.id = $1 AND reference_contacts.user_profile_id = up.id AND up.user_id = $2
       RETURNING reference_contacts.id`,
      [contactId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Reference contact not found' });
    }

    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting reference contact:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as referencesRouter };
