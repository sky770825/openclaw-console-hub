#!/usr/bin/env node
/**
 * 補齊「已批准但空的」任務：為缺 agent / runCommands 的 ready 任務寫入預設值，
 * 使它們能通過後端 gate、被 Auto-Executor 挑選（若未標 manual-only）。
 *
 * 用法：
 *   node fix-empty-tasks.js                    # 使用預設 API 位址與 key
 *   TASKBOARD_URL=http://localhost:3011 API_KEY=xxx node fix-empty-tasks.js
 *
 * 預設 runCommands：依任務描述與 SOP 執行，完成後填寫 RESULT 並 n8n 回報
 * 預設 agent：openclaw
 */

const TASKBOARD_URL = process.env.TASKBOARD_URL || 'http://localhost:3011';
const API_KEY = process.env.API_KEY || process.env.OPENCLAW_API_KEY || 'oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1';

// 曾缺 agent/runCommands 的任務 ID（含 ready 與 running），可依需要增減
const EMPTY_TASK_IDS = [
  't1772060285321', 't1772060286700', 't1772060285968', 't1772060283896',
  't1772060283140', 't1772060284614', 't1772142228546', 't1772142227899',
  't1772142227235', 't1772142113928', 't1772142113167', 't1772142112358',
  't1772142111532', 't1772142110583',
  // running 但原本也缺 agent/runCommands 的 10 筆
  't1772142413297', 't1772140974543', 't1772141252336', 't1772142067950',
  't1772141215358', 't1771326239258', 't1771283206432', 't1771326240115',
  't1771301319807', 't1772057484557',
];

const PATCH_BODY = {
  agent: { type: 'openclaw' },
  runCommands: ['# 依任務描述與 SOP 執行，完成後填寫 RESULT 並 n8n 回報'],
};

async function main() {
  console.log('TASKBOARD_URL:', TASKBOARD_URL);
  console.log('補齊任務數:', EMPTY_TASK_IDS.length);
  console.log('');

  let ok = 0;
  let err = 0;

  for (const id of EMPTY_TASK_IDS) {
    const url = `${TASKBOARD_URL}/api/tasks/${id}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
        body: JSON.stringify(PATCH_BODY),
      });
      const text = await res.text();
      if (!res.ok) {
        console.log(`FAIL ${id}`, res.status, text.slice(0, 120));
        err++;
        continue;
      }
      const data = JSON.parse(text);
      const hasAgent = data.agent?.type;
      const hasRun = Array.isArray(data.runCommands) && data.runCommands.length > 0;
      console.log(`OK   ${id}  agent=${hasAgent} runCommands=${hasRun ? data.runCommands.length : 0}`);
      ok++;
    } catch (e) {
      console.log(`ERR  ${id}`, e.message);
      err++;
    }
  }

  console.log('');
  console.log('--- 結果 ---');
  console.log('成功:', ok, '失敗:', err);
  process.exit(err > 0 ? 1 : 0);
}

main();
