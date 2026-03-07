/**
 * NEUXA 星群 Crew Bots v2 — Orchestrator-Worker 模式
 * 4 個常駐 bot + 2 個待命 bot（按需啟動）
 */

import { startCrewPolling, stopCrewPolling } from './crew-poller.js';
import { startCrewPatrol, stopCrewPatrol, triggerPatrolNow, onErrorDetected, onMetricsAnomaly } from './crew-patrol.js';

export function startCrewBots(): void {
  startCrewPolling();
  startCrewPatrol();
}

export function stopCrewBots(): void {
  stopCrewPolling();
  stopCrewPatrol();
}

// 巡邏
export { triggerPatrolNow } from './crew-patrol.js';
export { onErrorDetected, onMetricsAnomaly } from './crew-patrol.js';

// 配置
export type { CrewBotConfig } from './crew-config.js';
export { CREW_BOTS, ACTIVE_CREW_BOTS, STANDBY_CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';

// 路由
export { selectBestBot, routeAsHandoff } from './crew-router.js';

// Handoff
export { handoffToBot, spawnStandbyBot } from './crew-poller.js';
export type { StructuredTask } from './crew-poller.js';

// 醫生
export {
  fullCheckup,
  generateHealthReport,
  sendHealthReport,
  getAllHealthStatus,
  resetHealth,
  diagnoseAll,
  getStandbyStatus,
} from './crew-doctor.js';

// Inbox（精簡版）
export {
  scanInbox,
  scanAllInboxes,
  getInboxStats,
  getInboxContext,
} from './crew-inbox.js';
