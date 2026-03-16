import { logStore } from '@/data/logs';
import type { LogEntry } from '@/types';
import { optionalDelay } from './config';

export async function getLogs(): Promise<LogEntry[]> {
  await optionalDelay();
  return logStore;
}
