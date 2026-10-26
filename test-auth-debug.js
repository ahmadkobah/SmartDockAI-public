const axios = require('axios');

const API_URL = 'http://localhost:3000/api/auth';

async function testAuthDebug() {
  console.log('🧪 Testing Authentication with Debug Output\n');

  // Test Registration
  console.log('📝 Testing Registration...');
  try {
    const registerResponse = await axios.post(`${API_URL}/register`, {
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'password123',
      role: 'user'
    });

    console.log('✅ Registration successful:', registerResponse.data);
  } catch (error) {
    console.log('❌ Registration failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test Login
  console.log('🔐 Testing Login...');
  try {
    const loginResponse = await axios.post(`${API_URL}/login`, {
      email: 'testuser@example.com',
      password: 'password123'
    });

    console.log('✅ Login successful:', loginResponse.data);
  } catch (error) {
    console.log('❌ Login failed:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testAuthDebug();