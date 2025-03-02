import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/auth';

async function testAuth() {
  try {
    // Test Registration
    console.log('\nTesting Registration...');
    const registerResponse = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPass123',
        name: 'Test User'
      })
    });
    const registerData = await registerResponse.json();
    console.log('Register Response:', registerData);

    // Test Login
    console.log('\nTesting Login...');
    const loginResponse = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPass123'
      })
    });
    const loginData = await loginResponse.json();
    console.log('Login Response:', loginData);

    // Test Password Reset Request
    console.log('\nTesting Password Reset Request...');
    const resetResponse = await fetch(`${BASE_URL}/password/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com'
      })
    });
    const resetData = await resetResponse.json();
    console.log('Password Reset Response:', resetData);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests
testAuth().then(() => {
  console.log('\nTest completed');
}).catch(console.error);