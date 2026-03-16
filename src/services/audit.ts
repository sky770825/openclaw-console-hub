import { auditStore } from '@/data/audit';
import type { AuditLog } from '@/types';
import { optionalDelay } from './config';

export async function getAuditLogs(): Promise<AuditLog[]> {
  await optionalDelay();
  return auditStore;
}
