// server/src/routes/profile.ts
import { Router } from 'express';
import { db } from '../db'; // Assuming your db client is exported from here
import { ProfileDTO } from '../validators/profile'; // Import your Zod schema
import { requireAuth } from '../middleware/auth';

const profileRouter = Router();

// GET /api/profile
profileRouter.get('/', requireAuth, async (req, res) => {
  // Assuming user ID is available from authentication middleware
  const userId = (req as any).user?.id; // Adjust based on your actual auth middleware output

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  try {
    const profileQueryResult = await db.query(
      `SELECT
          up.id AS profile_id,
          up.user_id,
          up.forename,
          up.surname,
          up.middle_names,
          up.title,
          up.ni_number,
          up.available_date,
          up.mobile_phone,
          up.home_phone,
          up.work_phone,
          up.address_line_1,
          up.address_line_2,
          up.city,
          up.county,
          up.country,
          up.postcode,
          up.employment_status_with_target_org,
          up.immigration_status,
          up.read_job_desc_ack,
          up.nvq_level3_healthcare_ack,
          up.privacy_notice_consent_ack,
          up.professional_registration_details,
          up.disclosure_relationship_org_members,
          up.disclosure_previous_dismissal,
          up.disclosure_criminal_convictions,
          up.disclosure_health,
          up.personal_statement,
          up.person_specification_response,
          up.additional_information,
          -- Aggregate child tables into JSON arrays
          COALESCE(json_agg(DISTINCT er.*) FILTER (WHERE er.id IS NOT NULL), '[]') AS employment_records,
          COALESCE(json_agg(DISTINCT edr.*) FILTER (WHERE edr.id IS NOT NULL), '[]') AS education_records,
          COALESCE(json_agg(DISTINCT rcr.*) FILTER (WHERE rcr.id IS NOT NULL), '[]') AS reference_contacts,
      COALESCE(json_agg(DISTINCT ud.*) FILTER (WHERE ud.user_id IS NOT NULL), '[]') AS user_documents,
      COALESCE(json_agg(DISTINCT usr.*) FILTER (WHERE usr.id IS NOT NULL), '[]') AS user_skills
  FROM
      user_profiles up
  LEFT JOIN
      employment_records er ON er.user_profile_id = up.id
  LEFT JOIN
      education_records edr ON edr.user_profile_id = up.id
  LEFT JOIN
      reference_contacts rcr ON rcr.user_profile_id = up.id
  LEFT JOIN
      user_documents ud ON ud.user_id = up.user_id
  LEFT JOIN
      user_skills usr ON usr.user_profile_id = up.id
  WHERE
      up.user_id = $1
  GROUP BY
      up.id;`,
  [userId]
);

    const rawProfile = profileQueryResult.rows[0];

      if (!rawProfile) {
        // If no profile found, return an empty/default profile structure
        // that matches the ProfileDTO, perhaps with just the user_id
        // Provide default non-empty forename and surname to satisfy Zod schema
        const emptyProfile = { user_id: userId, forename: "N/A", surname: "N/A" }; // Add other required fields if ProfileDTO expects them without optional/nullable
        const parsedEmptyProfile = ProfileDTO.parse(emptyProfile);
        return res.status(200).json(parsedEmptyProfile);
      }

    // Adjust column names to match DTO if necessary (e.g., profile_id -> id)
    // Also convert date strings from DB back to Date objects for Zod's .coerce.date()
    const transformedProfile = {
      ...rawProfile,
      id: rawProfile.profile_id, // Map profile_id from query to id for DTO
      available_date: rawProfile.available_date ? new Date(rawProfile.available_date) : null,
      employment_records: rawProfile.employment_records.map((rec: any) => ({
        ...rec,
        start_date: new Date(rec.start_date),
        end_date: rec.end_date ? new Date(rec.end_date) : null,
      })),
      education_records: rawProfile.education_records.map((rec: any) => ({
        ...rec,
        start_date: new Date(rec.start_date),
        end_date: rec.end_date ? new Date(rec.end_date) : null,
      })),
      user_documents: rawProfile.user_documents.map((doc: any) => ({
        ...doc,
        uploaded_at: doc.uploaded_at ? new Date(doc.uploaded_at) : null,
      })),
      // No date transformations needed for reference_contacts or user_skills based on schema
    };

    // Use Zod to parse and validate the fetched data against your schema
    // This provides runtime validation and ensures the output matches Profile type
    const validatedProfile = ProfileDTO.parse(transformedProfile);

    res.status(200).json(validatedProfile);

  } catch (error: any) {
    console.error('Error fetching profile:', error);
    // Handle Zod validation errors specifically
    if (error.issues) {
      return res.status(400).json({ message: "Validation error on retrieved data", errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

// PUT /api/profile
profileRouter.put('/', requireAuth, async (req, res) => {
  const userId = (req as any).user?.id; // Get userId from authenticated request

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  try {
    // 1. Validate incoming request body against ProfileDTO
    // We use .partial() here to allow for partial updates if you want to support that later,
    // but for initial master row update, ProfileDTO.parse() is also fine if all fields are optional/nullable in PUT.
    // For this specific step ("master row only"), we'll focus on the ProfileDTO fields
    // directly corresponding to the user_profiles table.
    const incomingProfile = ProfileDTO.parse(req.body);

    // Filter out nested arrays as this PUT is for master row only for now
    const {
      employment_records, education_records, reference_contacts, user_documents, user_skills,
      id, user_id: incoming_user_id, // Exclude id and incoming user_id from direct update payload
      ...profileDataToUpdate // This will contain all direct user_profiles fields
    } = incomingProfile;

    // Convert Date objects back to ISO strings for PostgreSQL
    const sanitizedProfileData: Record<string, any> = { ...profileDataToUpdate };
    if (sanitizedProfileData.available_date) {
      sanitizedProfileData.available_date = (sanitizedProfileData.available_date as Date).toISOString();
    }
    // Add created_at and updated_at if they are part of your DTO and need to be handled.
    // Usually, updated_at is handled by DB triggers, but if your DTO includes it and expects client to send it, manage here.
    // For now, assume DB handles timestamps.

    // Get the keys and values for the UPSERT statement
    const columns = Object.keys(sanitizedProfileData).filter(key => key !== 'id' && key !== 'user_id'); // Ensure id/user_id are not updated directly
    const values = columns.map(col => sanitizedProfileData[col]);

    // Create SET clause for UPDATE part of UPSERT
    const setClause = columns.map((col, index) => `${col} = $${index + 2 + columns.length}`).join(', '); // Parameters for UPDATE come after INSERT values

    // SQL query for UPSERT (INSERT ... ON CONFLICT DO UPDATE)
    // We need to either find an existing profile_id for this user_id, or generate a new one.
    // Since user_profiles.id is the PK and user_profiles.user_id is unique, we can conflict on user_id.
    const upsertQuery = `
      INSERT INTO user_profiles (
          id, user_id, ${columns.join(', ')}
      ) VALUES (
          COALESCE((SELECT id FROM user_profiles WHERE user_id = $1), gen_random_uuid()),
          $1, ${columns.map((_, i) => `$${i + 2}`).join(', ')}
      )
      ON CONFLICT (user_id) DO UPDATE SET
          ${setClause}
      RETURNING *;
    `;
    // $1 = userId
    // $2 to $(1+columns.length) for INSERT values
    // $(2+columns.length) onwards for UPDATE values

    const result = await db.query(upsertQuery, [userId, ...values, ...values]);

    const updatedProfile = result.rows[0];

    // Transform updated profile from DB to match ProfileDTO structure for response
    const transformedProfile = {
      ...updatedProfile,
      id: updatedProfile.id, // Ensure it's 'id' for DTO
      available_date: updatedProfile.available_date ? new Date(updatedProfile.available_date) : null,
      employment_records: [], // Empty for master row only PUT
      education_records: [],
      reference_contacts: [],
      user_documents: [],
      user_skills: [],
    };

    // Re-validate and return the updated profile
    const validatedProfile = ProfileDTO.parse(transformedProfile);

    res.status(200).json(validatedProfile);

  } catch (error: any) {
    console.error('Error updating profile:', error);
    if (error.issues) { // Zod validation error
      return res.status(400).json({ message: "Validation Error", errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});


export { profileRouter };
