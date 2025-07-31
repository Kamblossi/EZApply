import request from 'supertest';
import { app } from '../src/index';
import { db } from '../src/db';
import { ProfileDTO } from '../src/validators/profile';
import jwt from 'jsonwebtoken';

describe('PUT /api/profile', () => {
  let putTestUserId: string;
  let putTestAuthToken: string;

  beforeEach(async () => {
    const newUserEmail = `putuser_${Date.now()}@example.com`;
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: newUserEmail,
        password: 'Password123!',
        forename: 'Put',
        surname: 'User',
      });
    
    putTestAuthToken = registerRes.body.token;
    
    // Ensure registration was successful
    expect(registerRes.status).toBe(200);
    expect(putTestAuthToken).toBeDefined();
    
    // Decode the JWT token to get the user ID
    const decoded = jwt.decode(putTestAuthToken) as { id: string } | null;
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBeDefined();
    putTestUserId = decoded!.id;
  });

  afterEach(async () => {
    await db.query('DELETE FROM users WHERE id = $1', [putTestUserId]);
    await db.query('DELETE FROM user_profiles WHERE user_id = $1', [putTestUserId]);
  });

  it('should create a new user profile on first PUT and return 200', async () => {
    const profileData = {
      forename: 'John',
      surname: 'Doe',
      mobile_phone: '0712345678',
      address_line_1: '123 Test St',
      city: 'Testville',
      country: 'UK',
      postcode: 'TS1 1ST',
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(profileData);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body).toHaveProperty('user_id', putTestUserId);
    expect(putRes.body).toHaveProperty('forename', profileData.forename);
    expect(putRes.body).toHaveProperty('surname', profileData.surname);
    expect(putRes.body).toHaveProperty('id');

    const getRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body).toMatchObject({
      user_id: putTestUserId,
      forename: profileData.forename,
      surname: profileData.surname,
      mobile_phone: profileData.mobile_phone,
      address_line_1: profileData.address_line_1,
    });

    const parsedProfile = ProfileDTO.safeParse(getRes.body);
    expect(parsedProfile.success).toBe(true);
  });

  it('should create profile with employment records and retrieve them correctly', async () => {
    const profileDataWithEmployment = {
      forename: 'Jane',
      surname: 'Doe',
      employment_records: [
        {
          employer: 'Tech Solutions Inc.',
          position: 'Software Developer',
          start_date: new Date('2020-01-01'),
          end_date: new Date('2023-12-31'),
          responsibilities: 'Developed backend services.',
          reason_for_leaving: 'New opportunity.',
          salary_information: '60000',
        },
        {
          employer: 'Startup Co.',
          position: 'Junior Dev',
          start_date: new Date('2018-05-01'),
          end_date: new Date('2019-12-31'),
          responsibilities: 'Assisted in front-end.',
          reason_for_leaving: 'Company closure.',
          salary_information: '30000',
        },
      ],
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(profileDataWithEmployment);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.employment_records).toHaveLength(2);
    
    // Check that both expected employment records are present (order may vary)
    const employers = putRes.body.employment_records.map((record: any) => record.employer);
    expect(employers).toContain('Tech Solutions Inc.');
    expect(employers).toContain('Startup Co.');
    
    const techSolutionsRecord = putRes.body.employment_records.find((record: any) => record.employer === 'Tech Solutions Inc.');
    const startupRecord = putRes.body.employment_records.find((record: any) => record.employer === 'Startup Co.');
    
    expect(techSolutionsRecord).toMatchObject({
      employer: 'Tech Solutions Inc.',
      position: 'Software Developer',
    });
    expect(startupRecord).toMatchObject({
      employer: 'Startup Co.',
      position: 'Junior Dev',
    });

    // Round-trip verification: GET should return the same data
    const getRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.forename).toBe('Jane');
    expect(getRes.body.employment_records).toHaveLength(2);
    
    // Check employment records in GET response as well
    const getEmployers = getRes.body.employment_records.map((record: any) => record.employer);
    expect(getEmployers).toContain('Tech Solutions Inc.');
    expect(getEmployers).toContain('Startup Co.');
    
    const getTechRecord = getRes.body.employment_records.find((record: any) => record.employer === 'Tech Solutions Inc.');
    expect(getTechRecord).toMatchObject({
      employer: 'Tech Solutions Inc.',
      position: 'Software Developer',
    });
    // Dates will be Date objects after Zod parsing on GET
    expect(getTechRecord.start_date).toBeDefined();
    expect(new Date(getTechRecord.start_date).toISOString().substring(0, 10)).toBe('2020-01-01');

    const parsedProfile = ProfileDTO.safeParse(getRes.body);
    expect(parsedProfile.success).toBe(true);
  });

  it('should update an existing user profile and return 200', async () => {
    const initialProfileData = {
      forename: 'Initial',
      surname: 'Profile',
      mobile_phone: '0700000000',
    };
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(initialProfileData);

    const updatedProfileData = {
      forename: 'Updated',
      surname: 'Name',
      mobile_phone: '0799999999',
      city: 'New City',
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(updatedProfileData);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body).toHaveProperty('user_id', putTestUserId);
    expect(putRes.body).toHaveProperty('forename', updatedProfileData.forename);
    expect(putRes.body).toHaveProperty('surname', updatedProfileData.surname);
    expect(putRes.body).toHaveProperty('mobile_phone', updatedProfileData.mobile_phone);
    expect(putRes.body).toHaveProperty('city', updatedProfileData.city);

    const getRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`);

    expect(getRes.statusCode).toBe(200);
    expect(getRes.body).toMatchObject({
      user_id: putTestUserId,
      forename: updatedProfileData.forename,
      surname: updatedProfileData.surname,
      mobile_phone: updatedProfileData.mobile_phone,
      city: updatedProfileData.city,
    });

    const parsedProfile = ProfileDTO.safeParse(getRes.body);
    expect(parsedProfile.success).toBe(true);
  });

  it('should return 400 for invalid profile data', async () => {
    const invalidProfileData = {
      forename: '',
      surname: 'Valid',
      mobile_phone: 12345,
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(invalidProfileData);

    expect(putRes.statusCode).toBe(400);
    expect(putRes.body).toHaveProperty('message', 'Validation Error');
    expect(putRes.body).toHaveProperty('errors');
    expect(putRes.body.errors).toBeInstanceOf(Array);
    expect(putRes.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('should return 401 if no token is provided for PUT', async () => {
    const putRes = await request(app)
      .put('/api/profile')
      .send({});

    expect(putRes.statusCode).toBe(401);
    expect(putRes.body).toHaveProperty('message');
  });

  it('should handle education records correctly', async () => {
    const profileDataWithEducation = {
      forename: 'John',
      surname: 'Doe',
      education_records: [
        {
          institution: 'University of Example',
          qualification_type: 'Bachelor',
          degree_diploma: 'Computer Science',
          field_of_study: 'Software Engineering',
          start_date: new Date('2015-09-01'),
          end_date: new Date('2019-06-30'),
          grade_score: 'First Class Honours',
        },
        {
          institution: 'Example College',
          qualification_type: 'A-Level',
          degree_diploma: 'A-Level',
          field_of_study: 'Mathematics, Physics, Computer Science',
          start_date: new Date('2013-09-01'),
          end_date: new Date('2015-06-30'),
          grade_score: 'A*A*A',
        },
      ],
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(profileDataWithEducation);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.education_records).toHaveLength(2);
    
    // Check that both expected education records are present (order may vary)
    const institutions = putRes.body.education_records.map((record: any) => record.institution);
    expect(institutions).toContain('University of Example');
    expect(institutions).toContain('Example College');
    
    const universityRecord = putRes.body.education_records.find((record: any) => record.institution === 'University of Example');
    const collegeRecord = putRes.body.education_records.find((record: any) => record.institution === 'Example College');
    
    expect(universityRecord).toMatchObject({
      institution: 'University of Example',
      qualification_type: 'Bachelor',
      degree_diploma: 'Computer Science',
    });
    expect(collegeRecord).toMatchObject({
      institution: 'Example College',
      qualification_type: 'A-Level',
      degree_diploma: 'A-Level',
    });

    const parsedProfile = ProfileDTO.safeParse(putRes.body);
    expect(parsedProfile.success).toBe(true);
  });

  it('should handle reference contacts correctly', async () => {
    const profileDataWithReferences = {
      forename: 'John',
      surname: 'Doe',
      reference_contacts: [
        {
          name: 'Dr. Jane Smith',
          relationship: 'Previous Manager',
          email: 'jane.smith@example.com',
          phone: '+44 20 1234 5678',
          company: 'Tech Solutions Ltd',
          position: 'Head of Development',
        },
        {
          name: 'Prof. Bob Johnson',
          relationship: 'Academic Supervisor',
          email: 'b.johnson@university.ac.uk',
          phone: '+44 20 8765 4321',
          company: 'University of Example',
          position: 'Professor of Computer Science',
        },
      ],
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(profileDataWithReferences);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.reference_contacts).toHaveLength(2);
    
    // Check that both expected contacts are present (order may vary)
    const contactNames = putRes.body.reference_contacts.map((contact: any) => contact.name);
    expect(contactNames).toContain('Dr. Jane Smith');
    expect(contactNames).toContain('Prof. Bob Johnson');
    
    const drSmithContact = putRes.body.reference_contacts.find((contact: any) => contact.name === 'Dr. Jane Smith');
    const profJohnsonContact = putRes.body.reference_contacts.find((contact: any) => contact.name === 'Prof. Bob Johnson');
    
    expect(drSmithContact).toMatchObject({
      name: 'Dr. Jane Smith',
      relationship: 'Previous Manager',
      email: 'jane.smith@example.com',
    });
    expect(profJohnsonContact).toMatchObject({
      name: 'Prof. Bob Johnson',
      relationship: 'Academic Supervisor',
      email: 'b.johnson@university.ac.uk',
    });

    const parsedProfile = ProfileDTO.safeParse(putRes.body);
    expect(parsedProfile.success).toBe(true);
  });

  it('should handle user skills correctly', async () => {
    const profileDataWithSkills = {
      forename: 'John',
      surname: 'Doe',
      user_skills: [
        {
          skill_name: 'JavaScript',
          proficiency_level: 'Advanced',
          category: 'Programming Languages',
        },
        {
          skill_name: 'Project Management',
          proficiency_level: 'Intermediate',
          category: 'Soft Skills',
        },
      ],
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(profileDataWithSkills);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.user_skills).toHaveLength(2);
    
    // Check that both expected skills are present (order may vary)
    const skillNames = putRes.body.user_skills.map((skill: any) => skill.skill_name);
    expect(skillNames).toContain('JavaScript');
    expect(skillNames).toContain('Project Management');
    
    const jsSkill = putRes.body.user_skills.find((skill: any) => skill.skill_name === 'JavaScript');
    const pmSkill = putRes.body.user_skills.find((skill: any) => skill.skill_name === 'Project Management');
    
    expect(jsSkill).toMatchObject({
      skill_name: 'JavaScript',
      proficiency_level: 'Advanced',
      category: 'Programming Languages',
    });
    expect(pmSkill).toMatchObject({
      skill_name: 'Project Management',
      proficiency_level: 'Intermediate',
      category: 'Soft Skills',
    });

    const parsedProfile = ProfileDTO.safeParse(putRes.body);
    expect(parsedProfile.success).toBe(true);
  });

  it('should handle empty child arrays correctly', async () => {
    const profileDataWithEmptyArrays = {
      forename: 'John',
      surname: 'Doe',
      employment_records: [],
      education_records: [],
      reference_contacts: [],
      user_documents: [],
      user_skills: [],
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(profileDataWithEmptyArrays);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.employment_records).toHaveLength(0);
    expect(putRes.body.education_records).toHaveLength(0);
    expect(putRes.body.reference_contacts).toHaveLength(0);
    expect(putRes.body.user_documents).toHaveLength(0);
    expect(putRes.body.user_skills).toHaveLength(0);

    const parsedProfile = ProfileDTO.safeParse(putRes.body);
    expect(parsedProfile.success).toBe(true);
  });

  it('should update child records on subsequent PUT (replace strategy)', async () => {
    // First, create a profile with some employment records
    const initialProfile = {
      forename: 'John',
      surname: 'Doe',
      employment_records: [
        {
          employer: 'Old Company',
          position: 'Old Position',
          start_date: new Date('2020-01-01'),
          end_date: new Date('2021-01-01'),
          responsibilities: 'Old responsibilities',
          reason_for_leaving: 'Career change',
          salary_information: '50000',
        },
      ],
    };

    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(initialProfile);

    // Then, update with different employment records
    const updatedProfile = {
      forename: 'John',
      surname: 'Doe',
      employment_records: [
        {
          employer: 'New Company A',
          position: 'New Position A',
          start_date: new Date('2021-01-01'),
          end_date: new Date('2022-01-01'),
          responsibilities: 'New responsibilities A',
          reason_for_leaving: 'Better opportunity',
          salary_information: '60000',
        },
        {
          employer: 'New Company B',
          position: 'New Position B',
          start_date: new Date('2022-01-01'),
          end_date: null,
          responsibilities: 'New responsibilities B',
          reason_for_leaving: null,
          salary_information: '70000',
        },
      ],
    };

    const putRes = await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${putTestAuthToken}`)
      .send(updatedProfile);

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.employment_records).toHaveLength(2);
    
    // Check that both expected records are present (order may vary)
    const employerNames = putRes.body.employment_records.map((record: any) => record.employer);
    expect(employerNames).toContain('New Company A');
    expect(employerNames).toContain('New Company B');
    
    const companyARecord = putRes.body.employment_records.find((record: any) => record.employer === 'New Company A');
    const companyBRecord = putRes.body.employment_records.find((record: any) => record.employer === 'New Company B');
    
    expect(companyARecord).toMatchObject({
      employer: 'New Company A',
      position: 'New Position A',
    });
    expect(companyBRecord).toMatchObject({
      employer: 'New Company B',
      position: 'New Position B',
    });

    // Verify the old record is gone
    expect(putRes.body.employment_records.some((record: any) => record.employer === 'Old Company')).toBe(false);

    const parsedProfile = ProfileDTO.safeParse(putRes.body);
    expect(parsedProfile.success).toBe(true);
  });
});

describe('DELETE /api/profile', () => {
    let putTestUserId: string;
    let putTestAuthToken: string;
    let putTestUser: any; // To store user details for verification

    beforeEach(async () => {
        const newUserEmail = `deleteuser_${Date.now()}@example.com`;
        const registerRes = await request(app)
            .post('/api/auth/register')
            .send({
                email: newUserEmail,
                password: 'Password123!',
                forename: 'Delete',
                surname: 'TestUser',
            });

        putTestAuthToken = registerRes.body.token;
        
        // Ensure registration was successful
        expect(registerRes.status).toBe(200);
        expect(putTestAuthToken).toBeDefined();
        
        const decoded = jwt.decode(putTestAuthToken) as { id: string, forename: string, surname: string } | null;
        expect(decoded).not.toBeNull();
        expect(decoded?.id).toBeDefined();
        putTestUserId = decoded!.id;
        putTestUser = { forename: decoded!.forename, surname: decoded!.surname }; // Store base user details
    });

    afterEach(async () => {
        // Clean up: Delete user and profile to ensure test isolation
        await db.query('DELETE FROM users WHERE id = $1', [putTestUserId]);
        await db.query('DELETE FROM user_profiles WHERE user_id = $1', [putTestUserId]);
    });

    // =====================================================================
    // DELETE /api/profile tests
    // =====================================================================

    it('should delete a user profile and all associated child records', async () => {
        // 1. Create a profile with master and some child data
        const initialProfile = {
            forename: 'Delete',
            surname: 'Me',
            employment_records: [{ employer: 'Old Job', position: 'Old Role', start_date: '2010-01-01T00:00:00.000Z', end_date: null }],
            education_records: [{ institution: 'Old School', qualification_type: 'Diploma', start_date: '2008-01-01T00:00:00.000Z', end_date: null, degree_diploma: 'Diploma' }],
        };
        await request(app)
            .put('/api/profile')
            .set('Authorization', `Bearer ${putTestAuthToken}`)
            .send(initialProfile);

        // 2. Verify it exists via GET
        const getResBeforeDelete = await request(app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${putTestAuthToken}`);
        expect(getResBeforeDelete.statusCode).toBe(200);
        expect(getResBeforeDelete.body.forename).toBe('Delete');
        expect(getResBeforeDelete.body.employment_records).toHaveLength(1);
        expect(getResBeforeDelete.body.education_records).toHaveLength(1);

        // 3. Perform the DELETE operation
        const deleteRes = await request(app)
            .delete('/api/profile')
            .set('Authorization', `Bearer ${putTestAuthToken}`);

        expect(deleteRes.statusCode).toBe(204); // Expect 204 No Content

        // 4. Verify the profile no longer exists via GET
        const getResAfterDelete = await request(app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${putTestAuthToken}`);

        expect(getResAfterDelete.statusCode).toBe(200); // GET returns 200 with partial/empty profile if user exists but profile base doesn't
        expect(getResAfterDelete.body.forename).toBeNull(); // Should be null after profile deletion
        expect(getResAfterDelete.body.surname).toBeNull(); // Should be null after profile deletion
        expect(getResAfterDelete.body.employment_records).toHaveLength(0); // Should be empty arrays
        expect(getResAfterDelete.body.education_records).toHaveLength(0);
        expect(getResAfterDelete.body.user_documents).toHaveLength(0);
        // Ensure no profile_id is returned, only base user details
        expect(getResAfterDelete.body.id).toBeUndefined(); // Assuming profile_id isn't set if no profile
        expect(getResAfterDelete.body.profile_id).toBeUndefined(); // Check both possible property names


        // Optional: Direct database check to ensure actual deletion (more advanced)
        // const profileDbCheck = await db.query('SELECT * FROM user_profiles WHERE user_id = $1', [putTestUserId]);
        // expect(profileDbCheck.rows).toHaveLength(0);
    });

    it('should return 404 if attempting to delete a profile that does not exist', async () => {
        // Ensure no profile exists for this user initially
        await request(app)
            .delete('/api/profile')
            .set('Authorization', `Bearer ${putTestAuthToken}`); // Delete if it exists from a prior test run

        // Attempt to delete again
        const deleteRes = await request(app)
            .delete('/api/profile')
            .set('Authorization', `Bearer ${putTestAuthToken}`);

        expect(deleteRes.statusCode).toBe(404);
        expect(deleteRes.body.message).toBe('Profile not found for this user.');
    });

    it('should return 401 if attempting to delete a profile without authentication', async () => {
        const deleteRes = await request(app)
            .delete('/api/profile')
            .send({}); // No token

        expect(deleteRes.statusCode).toBe(401);
        expect(deleteRes.body.message).toBe('Unauthorized: No token provided.');
    });
});
