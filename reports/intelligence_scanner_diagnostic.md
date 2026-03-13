# Diagnostic Report: IntelligenceScanner ask_ai Configuration
## Findings
### ask_ai Usage in Action Handlers
26-  run_script: '💡 执行完了 → 分析结果 + write_file 写报告 + index_file，三个一起发。',
27-  semantic_search: '💡 搜到了 → read_file 读原文 + write_file 写摘要，两个一起发。',
28-  web_search: '💡 搜到了 → web_fetch 读内容 + write_file 写笔记 + index_file，三个一起发。',
29-  web_fetch: '💡 读完了 → write_file 写笔记 + index_file 索引，两个一起发。',
30-  code_eval: '💡 执行完了 → write_file 写学习心得 + index_file 索引，两个一起发。',
31:  ask_ai: '💡 諮詢完了 → 把建議整理成 write_file 筆記 + index_file 索引，兩個一起發。',
32-  analyze_code: '💡 分析完了 → write_file 寫分析報告 + index_file 索引，兩個一起發。',
33-  query_supabase: '💡 查完了 → 有异常就 run_script 诊断 + write_file 写报告，一起发。',
34-  pty_exec: '💡 互動命令完成 → 檢查輸出是否正常，有問題再跑一次或 write_file 記錄結果。',
35-  patch_file: '💡 修補完了 → read_file 確認結果，或繼續 patch_file 改下一處。多處修改一起發。',
36-};
--
397-    child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
398-    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
399-
400-    const timer = setTimeout(() => {
401-      child.kill('SIGTERM');
402:      resolve({ ok: false, output: `[ask_ai] ${modelLabel} 超時 (60s)` });
403-    }, 60000);
404-
405-    child.on('close', (code) => {
406-      clearTimeout(timer);
407-      const durationMs = Date.now() - startTime;
--
409-      if (code === 0 && reply) {
410-        log.info(`[NEUXA-AskAI] model=${modelLabel} promptLen=${prompt.length} replyLen=${reply.length} duration=${durationMs}ms`);
411-        resolve({ ok: true, output: `[${modelLabel} | ${durationMs}ms]\n${reply}` });
412-      } else {
413-        log.warn(`[NEUXA-AskAI] ${modelLabel} exitCode=${code} stderr=${stderr.slice(0, 200)}`);
414:        resolve({ ok: false, output: `[ask_ai] ${modelLabel} 失敗 (exit=${code}): ${(stderr || stdout).slice(0, 300)}` });
415-      }
416-    });
417-
418-    child.on('error', (err) => {
419-      clearTimeout(timer);
420-      log.error({ err }, `[NEUXA-AskAI] Claude CLI spawn failed`);
421:      resolve({ ok: false, output: `[ask_ai] Claude CLI 無法啟動: ${err.message}` });
422-    });
423-  });
424-}
425-
426-/** NEUXA 諮詢 Gemini API */
--
452-      }
453-    );
454-
455-    if (!resp.ok) {
456-      const errText = await resp.text().catch(() => '');
457:      return { ok: false, output: sanitize(`[ask_ai] ${geminiModel} HTTP ${resp.status}: ${errText.slice(0, 200)}`) };
458-    }
459-
460-    const data = await resp.json() as Record<string, unknown>;
461-    const candidates = (data.candidates || []) as Array<Record<string, unknown>>;
462-    const candidate = candidates[0] || {};
--
469-
470-    return { ok: true, output: `[${geminiModel} | ${durationMs}ms]\n${reply}` };
471-  } catch (e) {
472-    const errMsg = e instanceof Error ? e.message : String(e);
473-    log.error({ err: e }, `[NEUXA-AskAI] ${geminiModel} failed`);
474:    return { ok: false, output: sanitize(`[ask_ai] ${geminiModel} 失敗: ${errMsg}`) };
475-  }
476-}
477-
478-/** NEUXA 諮詢 AI 代理 — 階梯式升級鏈，失敗自動往上爬 */
479-export async function handleAskAI(model: string, prompt: string, context?: string): Promise<ActionResult> {
--
1874-// ── 統一 action 調度器 ──
1875-
1876-/** 統一 action 調度器 */
1877-export async function executeNEUXAAction(action: Record<string, string>): Promise<ActionResult> {
1878-  const type = action.action;
1879:  log.info(`[NEUXA-Action] type=${type} path=${action.path || ''}${type === 'ask_ai' ? ` model=${action.model || '(none)'} promptLen=${(action.prompt || '').length} contextLen=${(action.context || '').length}` : ''}`);
1880-
1881-  let result: ActionResult;
1882-
1883-  switch (type) {
1884-    case 'create_task':
--
1907-      result = await handleSafeRunScript(action.command || action.cmd || '');
1908-      break;
1909-    case 'run_script_bg':
1910-      result = { ok: false, output: '🛑 背景腳本不開放。用 run_script 跑輕量工具，或 create_task 派工。' };
1911-      break;
1912:    case 'ask_ai':
1913-      result = await handleAskAI((action.model || 'flash').toLowerCase(), action.prompt || '', action.context);
1914-      break;
1915-    case 'proxy_fetch':
1916-      result = await handleProxyFetch(action.url || '', action.method || 'POST', action.body || '');
1917-      break;
-e 
### Proxy/AI Config Search Results
/Users/sky770825/openclaw任務面版設計/server/src/error-handler.ts:74:      /fetch|axios|request/i,
/Users/sky770825/openclaw任務面版設計/server/src/utils/key-vault.ts:10: * - routes/proxy.ts — 回應脫敏
/Users/sky770825/openclaw任務面版設計/server/src/telegram/action-handlers.ts:713:  if (!url) return { ok: false, output: 'proxy_fetch 需要 url 參數' };
/Users/sky770825/openclaw任務面版設計/server/src/telegram/action-handlers.ts:765:    return { ok: false, output: `proxy_fetch: URL 不在白名單。允許的目標: ${TARGETS.map(t => t.name).join(', ')}` };
/Users/sky770825/openclaw任務面版設計/server/src/telegram/action-handlers.ts:793:    return { ok: false, output: sanitize(`proxy_fetch ${target.name} 失敗: ${msg}`) };
/Users/sky770825/openclaw任務面版設計/server/src/telegram/action-handlers.ts:1915:    case 'proxy_fetch':
/Users/sky770825/openclaw任務面版設計/server/src/telegram/xiaocai-think.ts:299:呼叫外部 API（server 代理，自動注入 key）：{"action":"proxy_fetch","url":"https://...","method":"POST","body":"{}"}
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:79:import { proxyRouter } from './routes/proxy.js';
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:151:// If you deploy behind a reverse proxy (Caddy/Nginx/Cloudflare), set OPENCLAW_TRUST_PROXY=true
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:154:  // Express accepts boolean/number; 1 means trust first proxy hop.
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:155:  app.set('trust proxy', 1);
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:518:// API Key 安全代理（proxy_fetch action + HTTP endpoint）
/Users/sky770825/openclaw任務面版設計/server/src/index.ts:519:app.use('/api/proxy', proxyRouter);
/Users/sky770825/openclaw任務面版設計/server/src/routes/proxy.ts:4: * POST /api/proxy/fetch — 代理外部 API 請求，server 自動注入 key
/Users/sky770825/openclaw任務面版設計/server/src/routes/proxy.ts:5: * GET  /api/proxy/targets — 列出可用的代理目標（不暴露 key）
/Users/sky770825/openclaw任務面版設計/server/src/routes/proxy.ts:16:const log = createLogger('proxy');
/Users/sky770825/openclaw任務面版設計/server/src/routes/proxy.ts:17:const proxyRouter = Router();
/Users/sky770825/openclaw任務面版設計/server/src/routes/proxy.ts:71:// ─── POST /api/proxy/fetch ───
/Users/sky770825/openclaw任務面版設計/server/src/routes/proxy.ts:73:proxyRouter.post('/fetch', async (req: Request, res: Response) => {
/Users/sky770825/openclaw任務面版設計/server/src/routes/proxy.ts:134:// ─── GET /api/proxy/targets ───
