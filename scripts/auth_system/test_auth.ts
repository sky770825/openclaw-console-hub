import { AuthService } from './auth.service';
import { UserRole } from './types';

async function runTest() {
  const auth = new AuthService();
  
  console.log('--- Testing User Registration ---');
  const user = await auth.register({
    email: 'test@example.com',
    password: 'password123',
    role: UserRole.USER
  });
  console.log('Registered User:', user);

  console.log('\n--- Testing Store Admin Registration ---');
  const admin = await auth.register({
    email: 'admin@store.com',
    password: 'adminpassword',
    role: UserRole.STORE_ADMIN
  });
  console.log('Registered Admin:', admin);

  console.log('\n--- Testing Login ---');
  const loginResult = await auth.login('test@example.com', 'password123');
  console.log('Login Result:', loginResult);
}

runTest().catch(console.error);
