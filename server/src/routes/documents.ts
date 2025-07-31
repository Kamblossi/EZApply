import { Router, Request, Response } from 'express';
import { db } from '../db';
import { requireAuth } from '../middleware/auth';
import { UserDocumentDTO } from '../validators/profile';
import { z } from 'zod';

const router = Router();

// Get all user documents for the authenticated user
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

    // Get all user documents
    const result = await db.query(
      `SELECT id, file_name, file_path, document_type, mime_type, 
              uploaded_at, created_at, updated_at
       FROM user_documents 
       WHERE user_profile_id = $1 
       ORDER BY uploaded_at DESC`,
      [userProfileId]
    );

    const validatedDocuments = z.array(UserDocumentDTO).parse(result.rows);
    res.status(200).json({ data: validatedDocuments });

  } catch (error: any) {
    console.error('Error fetching user documents:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a specific user document
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const documentId = req.params.id;

    // Verify the document belongs to the user
    const result = await db.query(
      `SELECT ud.id, ud.file_name, ud.file_path, ud.document_type, 
              ud.mime_type, ud.uploaded_at, ud.created_at, ud.updated_at
       FROM user_documents ud
       JOIN user_profiles up ON ud.user_profile_id = up.id
       WHERE ud.id = $1 AND up.user_id = $2`,
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User document not found' });
    }

    const validatedDocument = UserDocumentDTO.parse(result.rows[0]);
    res.status(200).json(validatedDocument);

  } catch (error: any) {
    console.error('Error fetching user document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new user document
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const documentData = UserDocumentDTO.parse(req.body);

    // Get user's profile ID
    const profileResult = await db.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ message: 'User profile not found. Please create a profile first.' });
    }

    const userProfileId = profileResult.rows[0].id;

    // Insert the new user document
    const result = await db.query(
      `INSERT INTO user_documents 
       (user_profile_id, file_name, file_path, document_type, mime_type, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, NOW()))
       RETURNING id, file_name, file_path, document_type, mime_type, uploaded_at, created_at, updated_at`,
      [
        userProfileId,
        documentData.file_name,
        documentData.file_path,
        documentData.document_type,
        documentData.mime_type,
        documentData.uploaded_at
      ]
    );

    const newDocument = UserDocumentDTO.parse(result.rows[0]);
    res.status(201).json(newDocument);

  } catch (error: any) {
    console.error('Error creating user document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update a user document
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const documentId = req.params.id;
    const documentData = UserDocumentDTO.parse(req.body);

    // Verify the document belongs to the user and update it
    const result = await db.query(
      `UPDATE user_documents 
       SET file_name = $1, file_path = $2, document_type = $3, 
           mime_type = $4, uploaded_at = COALESCE($5, uploaded_at), updated_at = NOW()
       FROM user_profiles up
       WHERE user_documents.id = $6 AND user_documents.user_profile_id = up.id AND up.user_id = $7
       RETURNING user_documents.id, file_name, file_path, document_type, mime_type, uploaded_at,
                 user_documents.created_at, user_documents.updated_at`,
      [
        documentData.file_name,
        documentData.file_path,
        documentData.document_type,
        documentData.mime_type,
        documentData.uploaded_at,
        documentId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User document not found' });
    }

    const updatedDocument = UserDocumentDTO.parse(result.rows[0]);
    res.status(200).json(updatedDocument);

  } catch (error: any) {
    console.error('Error updating user document:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a user document
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const documentId = req.params.id;

    // Verify the document belongs to the user and delete it
    const result = await db.query(
      `DELETE FROM user_documents 
       USING user_profiles up
       WHERE user_documents.id = $1 AND user_documents.user_profile_id = up.id AND up.user_id = $2
       RETURNING user_documents.id`,
      [documentId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User document not found' });
    }

    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting user document:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as documentsRouter };
