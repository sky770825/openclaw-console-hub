/**
 * NEUXA 星群 Crew Bots — 公開 API
 * 6 個 AI bot 在群組裡獨立思考、互動
 */

export { startCrewPolling as startCrewBots, stopCrewPolling as stopCrewBots } from './crew-poller.js';
export type { CrewBotConfig } from './crew-config.js';
export { CREW_BOTS, CREW_GROUP_CHAT_ID } from './crew-config.js';
