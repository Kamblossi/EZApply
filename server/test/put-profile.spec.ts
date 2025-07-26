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
    // Decode the JWT token to get the user ID
    const decoded = jwt.decode(putTestAuthToken) as { id: string };
    putTestUserId = decoded.id;
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
});
