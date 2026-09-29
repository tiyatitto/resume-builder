// Test script to verify API
const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- STARTING API TESTS ---');
  let token1, token2;
  let resumeId;

  try {
    // 1. Register User A
    console.log('1. Registering User A...');
    const resA = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: 'usera@test.com', password: 'password123' })
    });
    const dataA = await resA.json();
    if(resA.ok) token1 = dataA.token;
    console.log(dataA.message || 'User A registered');

    // 2. Login User A
    console.log('2. Logging in User A...');
    const loginA = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'usera@test.com', password: 'password123' })
    });
    const loginDataA = await loginA.json();
    if(loginA.ok) token1 = loginDataA.token;
    console.log(loginDataA.token ? 'Login successful' : 'Login failed');

    // 3. Create Resume for User A
    console.log('3. Creating resume for User A...');
    const createRes = await fetch(`${API_URL}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({ personalInfo: { fullName: 'User A Name' } })
    });
    const createData = await createRes.json();
    resumeId = createData.data._id;
    console.log(createData.message);

    // 4. Update Resume
    console.log('4. Updating resume...');
    const updateRes = await fetch(`${API_URL}/resume/${resumeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
      body: JSON.stringify({ personalInfo: { fullName: 'User A Updated' } })
    });
    const updateData = await updateRes.json();
    console.log(updateData.message, updateData.data.personalInfo.fullName);

    // 5. Register User B
    console.log('5. Registering User B...');
    const resB = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: 'userb@test.com', password: 'password123' })
    });
    const dataB = await resB.json();
    if(resB.ok) token2 = dataB.token;

    // 6. User B trying to access User A's resume
    console.log('6. Testing Unauthorized Access (User B -> User A Resume)...');
    const unauthorizedRes = await fetch(`${API_URL}/resume/${resumeId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token2}` }
    });
    const unauthorizedData = await unauthorizedRes.json();
    console.log(unauthorizedRes.status === 401 ? 'Success: Access blocked' : 'Error: Access allowed');
    console.log(unauthorizedData.message);

    // 7. Delete Resume
    console.log('7. Deleting Resume...');
    const delRes = await fetch(`${API_URL}/resume/${resumeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token1}` }
    });
    console.log((await delRes.json()).message);

    console.log('--- ALL TESTS COMPLETED ---');
  } catch(e) {
    console.error('Test failed:', e.message);
  }
}

runTests();
