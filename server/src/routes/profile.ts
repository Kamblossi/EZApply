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

export { profileRouter };
