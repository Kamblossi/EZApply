// test/granular-endpoints.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/index';
import { db } from '../src/db'; // Use the shared database connection

let authToken: string;
let userId: string;
let userProfileId: string;

beforeAll(async () => {
  // Clean up existing test data
  await db.query('DELETE FROM users WHERE email = $1', ['granular.test@example.com']);

  // Register a user for testing
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      email: 'granular.test@example.com',
      password: 'Test123!',
      forename: 'Granular',
      surname: 'User',
    });

  // Debug registration response
  if (registerResponse.status !== 200) {
    console.error('Registration failed:', registerResponse.status, registerResponse.body);
    throw new Error(`Registration failed with status ${registerResponse.status}`);
  }

  authToken = registerResponse.body.token;
  
  // Debug token
  if (!authToken) {
    console.error('No token in response:', registerResponse.body);
    throw new Error('No token received from registration');
  }
  
  // Decode JWT to get user ID
  const decoded = jwt.decode(authToken) as { id: string } | null;
  if (!decoded || !decoded.id) {
    console.error('Failed to decode token:', authToken);
    console.error('Decoded result:', decoded);
    throw new Error('Failed to decode JWT token');
  }
  userId = decoded.id;

  // Create a profile for testing granular endpoints
  const profileResponse = await request(app)
    .put('/api/profile')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      forename: 'Granular',
      surname: 'Test',
      mobile_phone: '1234567890',
      email: 'granular.test@example.com'
    });

  userProfileId = profileResponse.body.id;
});

afterAll(async () => {
  // Clean up test data
  await db.query('DELETE FROM users WHERE email = $1', ['granular.test@example.com']);
  // Don't call db.end() since db is shared - it will be managed by the test framework
});

describe('Granular Employment Endpoints', () => {
  let employmentId: string;

  it('should create a new employment record', async () => {
    const response = await request(app)
      .post('/api/profile/employment')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employer: 'Test Company',
        position: 'Software Developer',
        start_date: '2020-01-01',
        end_date: '2023-12-31',
        responsibilities: 'Developed software applications',
        reason_for_leaving: 'New opportunity',
        salary_information: '75000'
      });

    expect(response.status).toBe(201);
    expect(response.body.employer).toBe('Test Company');
    expect(response.body.position).toBe('Software Developer');
    employmentId = response.body.id;
  });

  it('should get all employment records for the user', async () => {
    const response = await request(app)
      .get('/api/profile/employment')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].employer).toBe('Test Company');
  });

  it('should get a specific employment record', async () => {
    const response = await request(app)
      .get(`/api/profile/employment/${employmentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.employer).toBe('Test Company');
    expect(response.body.id).toBe(employmentId);
  });

  it('should update an employment record', async () => {
    const response = await request(app)
      .put(`/api/profile/employment/${employmentId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employer: 'Updated Company',
        position: 'Senior Software Developer',
        start_date: '2020-01-01',
        end_date: '2023-12-31',
        responsibilities: 'Led development team',
        reason_for_leaving: 'Career advancement',
        salary_information: '85000'
      });

    expect(response.status).toBe(200);
    expect(response.body.employer).toBe('Updated Company');
    expect(response.body.position).toBe('Senior Software Developer');
  });

  it('should delete an employment record', async () => {
    const response = await request(app)
      .delete(`/api/profile/employment/${employmentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(204);

    // Verify it's deleted
    const getResponse = await request(app)
      .get(`/api/profile/employment/${employmentId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(getResponse.status).toBe(404);
  });
});

describe('Granular Education Endpoints', () => {
  let educationId: string;

  it('should create a new education record', async () => {
    const response = await request(app)
      .post('/api/profile/education')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        institution: 'Test University',
        qualification_type: 'Bachelor',
        degree_diploma: 'Computer Science',
        field_of_study: 'Software Engineering',
        start_date: '2016-09-01',
        end_date: '2020-06-01',
        grade_score: 'First Class Honours'
      });

    expect(response.status).toBe(201);
    expect(response.body.institution).toBe('Test University');
    expect(response.body.degree_diploma).toBe('Computer Science');
    educationId = response.body.id;
  });

  it('should get all education records for the user', async () => {
    const response = await request(app)
      .get('/api/profile/education')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].institution).toBe('Test University');
  });

  it('should update an education record', async () => {
    const response = await request(app)
      .put(`/api/profile/education/${educationId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        institution: 'Updated University',
        qualification_type: 'Bachelor',
        degree_diploma: 'Computer Science',
        field_of_study: 'Software Engineering',
        start_date: '2016-09-01',
        end_date: '2020-06-01',
        grade_score: 'First Class Honours'
      });

    expect(response.status).toBe(200);
    expect(response.body.institution).toBe('Updated University');
  });

  it('should delete an education record', async () => {
    const response = await request(app)
      .delete(`/api/profile/education/${educationId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(204);
  });
});

describe('Granular References Endpoints', () => {
  let referenceId: string;

  it('should create a new reference contact', async () => {
    const response = await request(app)
      .post('/api/profile/references')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'John Doe',
        relationship: 'Former Manager',
        email: 'john.doe@example.com',
        phone: '555-0123',
        company: 'Previous Company',
        position: 'Engineering Manager'
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('John Doe');
    expect(response.body.relationship).toBe('Former Manager');
    referenceId = response.body.id;
  });

  it('should get all reference contacts for the user', async () => {
    const response = await request(app)
      .get('/api/profile/references')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe('John Doe');
  });

  it('should delete a reference contact', async () => {
    const response = await request(app)
      .delete(`/api/profile/references/${referenceId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(204);
  });
});

describe('Granular Skills Endpoints', () => {
  let skillId: string;

  it('should create a new user skill', async () => {
    const response = await request(app)
      .post('/api/profile/skills')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        skill_name: 'JavaScript',
        proficiency_level: 'Advanced',
        category: 'Programming Language'
      });

    expect(response.status).toBe(201);
    expect(response.body.skill_name).toBe('JavaScript');
    expect(response.body.proficiency_level).toBe('Advanced');
    skillId = response.body.id;
  });

  it('should get all user skills for the user', async () => {
    const response = await request(app)
      .get('/api/profile/skills')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].skill_name).toBe('JavaScript');
  });

  it('should delete a user skill', async () => {
    const response = await request(app)
      .delete(`/api/profile/skills/${skillId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(204);
  });
});

describe('User Isolation Tests', () => {
  let otherAuthToken: string;
  let otherUserId: string;
  let testEmploymentId: string;

  beforeEach(async () => {
    // Create another user to test isolation
    await db.query('DELETE FROM users WHERE email = $1', ['other.user@example.com']);
    
    const otherUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'other.user@example.com',
        password: 'Test123!',
        forename: 'Other',
        surname: 'User'
      });

    otherAuthToken = otherUserResponse.body.token;
    
    // Decode JWT to get user ID
    const decodedOther = jwt.decode(otherAuthToken) as { id: string } | null;
    if (!decodedOther || !decodedOther.id) {
      throw new Error('Failed to decode other user JWT token');
    }
    otherUserId = decodedOther.id;

    // Create a profile for the other user
    await request(app)
      .put('/api/profile')
      .set('Authorization', `Bearer ${otherAuthToken}`)
      .send({
        forename: 'Other',
        surname: 'User',
        mobile_phone: '9876543210',
        email: 'other.user@example.com'
      });

    // Create an employment record for the original user
    const employmentResponse = await request(app)
      .post('/api/profile/employment')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        employer: 'Secret Company',
        position: 'Secret Position',
        start_date: '2020-01-01',
        end_date: null
      });

    testEmploymentId = employmentResponse.body.id;
  });

  it('should not allow access to other users employment records', async () => {
    const response = await request(app)
      .get(`/api/profile/employment/${testEmploymentId}`)
      .set('Authorization', `Bearer ${otherAuthToken}`);

    expect(response.status).toBe(404);
  });

  it('should not allow updating other users employment records', async () => {
    const response = await request(app)
      .put(`/api/profile/employment/${testEmploymentId}`)
      .set('Authorization', `Bearer ${otherAuthToken}`)
      .send({
        employer: 'Hacked Company',
        position: 'Hacker',
        start_date: '2020-01-01',
        end_date: null
      });

    expect(response.status).toBe(404);
  });

  it('should not allow deleting other users employment records', async () => {
    const response = await request(app)
      .delete(`/api/profile/employment/${testEmploymentId}`)
      .set('Authorization', `Bearer ${otherAuthToken}`);

    expect(response.status).toBe(404);
  });
});
