export enum UserRole {
  USER = 'USER',
  STORE_ADMIN = 'STORE_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN'
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  profile: {
    name: string;
    phone?: string;
    avatar?: string;
  };
  createdAt: Date;
}
