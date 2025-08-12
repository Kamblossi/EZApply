const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test authentication and profile endpoints
async function testBackend() {
  try {
    console.log('Testing backend endpoints...\n');

    // Test 1: Register a test user
    console.log('1. Testing user registration...');
    const registrationData = {
      email: `test_${Date.now()}@example.com`,
      password: 'testpassword123',
      forename: 'Test',
      surname: 'User'
    };

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registrationData);
    console.log('✅ Registration successful');
    
    const token = registerResponse.data.token;
    const authHeader = { Authorization: `Bearer ${token}` };

    // Test 2: Get profile
    console.log('\n2. Testing profile retrieval...');
    const profileResponse = await axios.get(`${BASE_URL}/profile`, { headers: authHeader });
    console.log('✅ Profile retrieved successfully');
    console.log('Profile data:', JSON.stringify(profileResponse.data, null, 2));

    // Test 3: Update profile
    console.log('\n3. Testing profile update...');
    const updateData = {
      forename: 'Updated',
      surname: 'Name',
      mobile_phone: '1234567890',
      city: 'Test City',
      country: 'Test Country'
    };

    const updateResponse = await axios.put(`${BASE_URL}/profile`, updateData, { headers: authHeader });
    console.log('✅ Profile updated successfully');

    // Test 4: Create employment record
    console.log('\n4. Testing employment creation...');
    const employmentData = {
      employer: 'Test Company',
      position: 'Software Developer',
      start_date: '2023-01-01',
      responsibilities: 'Writing code and tests'
    };

    const employmentResponse = await axios.post(`${BASE_URL}/profile/employment`, employmentData, { headers: authHeader });
    console.log('✅ Employment record created successfully');

    // Test 5: Get employment records
    console.log('\n5. Testing employment retrieval...');
    const getEmploymentResponse = await axios.get(`${BASE_URL}/profile/employment`, { headers: authHeader });
    console.log('✅ Employment records retrieved successfully');
    console.log('Employment data:', JSON.stringify(getEmploymentResponse.data, null, 2));

    // Test 6: Create education record
    console.log('\n6. Testing education creation...');
    const educationData = {
      institution: 'Test University',
      qualification_type: 'Bachelor',
      degree_diploma: 'Computer Science',
      field_of_study: 'Software Engineering',
      start_date: '2019-09-01',
      end_date: '2023-06-01'
    };

    const educationResponse = await axios.post(`${BASE_URL}/profile/education`, educationData, { headers: authHeader });
    console.log('✅ Education record created successfully');

    // Test 7: Get education records
    console.log('\n7. Testing education retrieval...');
    const getEducationResponse = await axios.get(`${BASE_URL}/profile/education`, { headers: authHeader });
    console.log('✅ Education records retrieved successfully');
    console.log('Education data:', JSON.stringify(getEducationResponse.data, null, 2));

    console.log('\n🎉 All backend tests passed successfully!');

  } catch (error) {
    console.error('❌ Backend test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testBackend();
