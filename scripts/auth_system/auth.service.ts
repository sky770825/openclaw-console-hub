import crypto from 'crypto';

export class AuthService {
  // Mock DB
  private users: any[] = [];

  async register(userData: any) {
    const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
    const newUser = {
      ...userData,
      password: hashedPassword,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date()
    };
    this.users.push(newUser);
    return { id: newUser.id, email: newUser.email, role: newUser.role };
  }

  async login(email: string, pass: string) {
    const hashedPassword = crypto.createHash('sha256').update(pass).digest('hex');
    const user = this.users.find(u => u.email === email && u.password === hashedPassword);
    if (!user) throw new Error('Invalid credentials');
    
    // In real app, generate JWT here
    return { token: 'mock-jwt-token', user: { id: user.id, role: user.role } };
  }

  async requestPasswordReset(email: string) {
    // Generate reset token and logic
    return { message: 'Reset link sent to email' };
  }
}
