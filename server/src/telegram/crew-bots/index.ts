/**
 * NEUXA 星群 Crew Bots — 公開 API
 * 6 個 AI bot 在群組裡獨立思考、互動 + 主動巡邏
 */

import { startCrewPolling, stopCrewPolling } from './crew-poller.js';
import { startCrewPatrol, stopCrewPatrol, triggerPatrolNow } from './crew-patrol.js';

export function startCrewBots(): void {
  startCrewPolling();
  startCrewPatrol();
}

export function stopCrewBots(): void {
  stopCrewPolling();
  stopCrewPatrol();
}

export { triggerPatrolNow } from './crew-patrol.js';
export type { CrewBotConfig } from './crew-config.js';
export { CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
export {
  fullCheckup,
  generateHealthReport,
  sendHealthReport,
  getAllHealthStatus,
  resetHealth,
  diagnoseAll,
} from './crew-doctor.js';
