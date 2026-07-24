import { getDb, saveDb, getAllUsers, saveUser, deleteUser, addLoginAttempt, getAllAttempts } from '../db';

async function runTests() {
  console.log('--- Initializing database test ---');
  
  // 1. Get initial DB state
  const db = getDb();
  console.log('Current users count:', db.users.length);
  console.log('Current attempts count:', db.attempts.length);

  // 2. Add a dummy test user access record
  const testUser = {
    id: 'usr_test_123',
    email: 'test-admin-check@example.com',
    password: 'password-123',
    duration: '1m' as const,
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    activatedAt: null,
    expiresAt: null,
    sessionId: null,
    deviceInfo: null,
  };

  console.log('Saving test user...');
  saveUser(testUser);

  // 3. Verify user was saved
  const users = getAllUsers();
  const found = users.find(u => u.id === 'usr_test_123');
  if (found) {
    console.log('SUCCESS: User was saved and retrieved successfully!');
  } else {
    console.error('ERROR: Saved user was not found!');
  }

  // 4. Log a login attempt
  console.log('Adding test login attempt...');
  addLoginAttempt({
    email: 'test-admin-check@example.com',
    passwordAttempted: 'password-123',
    timestamp: new Date().toISOString(),
    success: true,
    status: 'success',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    ip: '127.0.0.1',
    deviceInfo: 'Safari on macOS (Desktop)',
  });

  const attempts = getAllAttempts();
  if (attempts.length > 0 && attempts[0].email === 'test-admin-check@example.com') {
    console.log('SUCCESS: Login attempt was logged and retrieved successfully!');
  } else {
    console.error('ERROR: Login attempt was not logged!');
  }

  // 5. Clean up
  console.log('Cleaning up test user...');
  deleteUser('usr_test_123');

  // Verify deletion
  const postDeleteUsers = getAllUsers();
  if (!postDeleteUsers.some(u => u.id === 'usr_test_123')) {
    console.log('SUCCESS: Test user cleaned up successfully!');
  } else {
    console.error('ERROR: Deletion failed!');
  }

  console.log('--- Database tests completed successfully ---');
}

runTests().catch(err => {
  console.error('Test run failed with error:', err);
});
