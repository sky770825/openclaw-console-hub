import { loadAlerts, saveAlerts } from './seed';
import type { Alert } from '@/types';
import { optionalDelay } from './config';

export async function getAlerts(): Promise<Alert[]> {
  await optionalDelay();
  return loadAlerts();
}

export async function updateAlertStatus(
  id: string,
  status: Alert['status']
): Promise<Alert | undefined> {
  await optionalDelay();
  const alerts = loadAlerts();
  const index = alerts.findIndex((a) => a.id === id);
  if (index === -1) return undefined;
  alerts[index] = { ...alerts[index], status };
  saveAlerts(alerts);
  return alerts[index];
}
