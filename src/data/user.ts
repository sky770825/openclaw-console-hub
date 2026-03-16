import type { User } from '@/types';

/** 當前使用者（mock 可替換為 API / Auth） */
export const currentUser: User = {
  id: 'user-001',
  name: '開發者',
  email: 'alex@openclaw.io',
  role: 'admin',
};
