import { currentUser } from '@/data/user';
import type { User } from '@/types';
import { optionalDelay } from './config';

export async function getCurrentUser(): Promise<User> {
  await optionalDelay();
  return currentUser;
}
