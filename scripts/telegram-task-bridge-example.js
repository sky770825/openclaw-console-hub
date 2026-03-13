#!/usr/bin/env node
/**
 * Telegram task bridge example (Node.js + Express)
 * 僅供參考／手動執行，不會被任務板或 OpenClaw 自動啟動。
 *
 * Features:
 * - Parse Telegram commands: #task 新增|執行|重跑|查詢|列表
 * - Forward requests to task-board API
 * - Verify result webhook signatures (HMAC-SHA256 + timestamp + nonce)
 *
 * Required env:
 * - PORT=3100
 * - TASK_API_BASE=http://localhost:3011
 * - WEBHOOK_SECRET=change-me
 *
 * Optional env:
 * - TELEGRAM_BOT_TOKEN=<bot token> (for replying in Telegram)
 * - WEBHOOK_MAX_SKEW_SEC=300
 * - NONCE_TTL_MS=600000
 */

const crypto = require("node:crypto");
const express = require("express");

const PORT = Number(process.env.PORT || 3100);
const TASK_API_BASE = process.env.TASK_API_BASE || "http://localhost:3011";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const WEBHOOK_MAX_SKEW_SEC = Number(process.env.WEBHOOK_MAX_SKEW_SEC || 300);
const NONCE_TTL_MS = Number(process.env.NONCE_TTL_MS || 10 * 60 * 1000);

if (!WEBHOOK_SECRET) {
  console.warn("[WARN] WEBHOOK_SECRET is empty. Webhook verification will reject all requests.");
}

const app = express();
app.use(
  express.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

const NONCE_CACHE = new Map();

function cleanupNonceCache(nowMs) {
  for (const [nonce, expiresAt] of NONCE_CACHE.entries()) {
    if (expiresAt <= nowMs) NONCE_CACHE.delete(nonce);
  }
}

function normalizeAction(rawAction) {
  const action = (rawAction || "").trim();
  const map = new Map([
    ["新增", "create"],
    ["create", "create"],
    ["執行", "run"],
    ["run", "run"],
    ["重跑", "rerun"],
    ["rerun", "rerun"],
    ["查詢", "get"],
    ["get", "get"],
    ["列表", "list"],
    ["list", "list"],
  ]);
  return map.get(action.toLowerCase()) || map.get(action) || null;
}

function parseTaskCommand(inputText) {
  const text = String(inputText || "").trim();
  if (!text.startsWith("#task")) {
    return fail("E1001", "invalid command prefix, expected #task");
  }

  const body = text.slice(5).trim();
  if (!body) {
    return fail("E1002", "unknown action");
  }

  const parts = body.split("|").map((s) => s.trim()).filter(Boolean);
  const action = normalizeAction(parts[0]);
  if (!action) {
    return fail("E1002", "unknown action");
  }

  const fields = {};
  for (let i = 1; i < parts.length; i += 1) {
    const segment = parts[i];
    const eq = segment.indexOf("=");
    if (eq < 1) {
      return fail("E1004", `invalid field format: ${segment}`);
    }
    const key = segment.slice(0, eq).trim().toLowerCase();
    const value = segment.slice(eq + 1).trim();
    if (!/^[a-z0-9_]+$/.test(key)) {
      return fail("E1004", `invalid key: ${key}`);
    }
    fields[key] = value;
  }

  const requiredByAction = {
    create: ["title", "goal"],
    run: ["id"],
    rerun: ["run"],
    get: ["id"],
    list: [],
  };
  for (const key of requiredByAction[action]) {
    if (!fields[key]) return fail("E1003", `missing required field: ${key}`);
  }

  if (fields.priority && !["low", "normal", "high", "urgent"].includes(fields.priority)) {
    return fail("E1005", "invalid priority");
  }
  if (fields.due) {
    const dueTs = Date.parse(fields.due);
    if (Number.isNaN(dueTs)) return fail("E1004", "invalid due format");
    fields.scheduled_at = new Date(dueTs).toISOString();
  }

  if (fields.id && !fields.id.startsWith("task_")) {
    return fail("E1004", "id should start with task_");
  }
  if (fields.run && !fields.run.startsWith("run_")) {
    return fail("E1004", "run should start with run_");
  }

  return { ok: true, action, fields };
}

function fail(errorCode, message, httpStatus = 400) {
  return { ok: false, httpStatus, errorCode, message };
}

function ok(data) {
  return { ok: true, ...data };
}

async function taskApi(path, options = {}) {
  try {
    const res = await fetch(`${TASK_API_BASE}${path}`, {
      timeout: 10_000,
      headers: { "content-type": "application/json", ...(options.headers || {}) },
      ...options,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      return fail("E2002", `task api http ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`, 502);
    }
    return ok({ data });
  } catch (err) {
    return fail("E2001", `task api timeout/error: ${err.message}`, 504);
  }
}

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (err) {
    console.error("[telegram] send failed:", err.message);
  }
}

async function handleTaskAction(parsed, telegramMeta) {
  const { action, fields } = parsed;
  if (action === "create") {
    const payload = {
      title: fields.title,
      goal: fields.goal,
      scheduled_at: fields.scheduled_at || null,
      priority: fields.priority || "normal",
      owner: fields.assignee || "openclaw",
      source_chat_id: String(telegramMeta.chatId),
      created_by: telegramMeta.username || `tg_${telegramMeta.fromId}`,
    };
    return taskApi("/api/tasks", { method: "POST", body: JSON.stringify(payload) });
  }
  if (action === "run") return taskApi(`/api/tasks/${fields.id}/run`, { method: "POST", body: "{}" });
  if (action === "rerun") return taskApi(`/api/runs/${fields.run}/rerun`, { method: "POST", body: "{}" });
  if (action === "get") return taskApi(`/api/tasks/${fields.id}`);
  if (action === "list") {
    const statusQuery = fields.status ? `?status=${encodeURIComponent(fields.status)}` : "";
    return taskApi(`/api/tasks${statusQuery}`);
  }
  return fail("E1002", "unknown action");
}

function verifyWebhookHeaders(headers, rawBody) {
  const timestampRaw = headers["x-oc-timestamp"];
  const nonce = headers["x-oc-nonce"];
  const signatureRaw = headers["x-oc-signature"];

  if (!timestampRaw || !nonce || !signatureRaw) {
    return fail("E3001", "missing signature headers", 401);
  }

  const timestamp = Number(timestampRaw);
  if (!Number.isFinite(timestamp)) {
    return fail("E3001", "invalid timestamp", 401);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > WEBHOOK_MAX_SKEW_SEC) {
    return fail("E3002", "timestamp expired", 401);
  }

  const nowMs = Date.now();
  cleanupNonceCache(nowMs);
  if (NONCE_CACHE.has(nonce)) {
    return fail("E3003", "nonce replayed", 401);
  }

  const signingPayload = `${timestampRaw}.${nonce}.${rawBody}`;
  const computed = crypto.createHmac("sha256", WEBHOOK_SECRET).update(signingPayload).digest("hex");
  const incoming = String(signatureRaw).replace(/^sha256=/, "");

  const a = Buffer.from(incoming, "hex");
  const b = Buffer.from(computed, "hex");
  if (a.length === 0 || b.length === 0 || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return fail("E3001", "signature invalid", 401);
  }

  NONCE_CACHE.set(nonce, nowMs + NONCE_TTL_MS);
  return ok({});
}

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, service: "telegram-task-bridge", taskApiBase: TASK_API_BASE });
});

app.post("/telegram/webhook", async (req, res) => {
  const message = req.body?.message;
  const text = message?.text || "";
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const username = message?.from?.username || null;

  if (!chatId || !fromId) {
    return res.status(200).json({ ok: true, ignored: true, reason: "not a user message" });
  }

  const parsed = parseTaskCommand(text);
  if (!parsed.ok) {
    await sendTelegramMessage(chatId, `指令錯誤 ${parsed.errorCode}: ${parsed.message}`);
    return res.status(parsed.httpStatus || 400).json({
      ok: false,
      error_code: parsed.errorCode,
      message: parsed.message,
    });
  }

  const result = await handleTaskAction(parsed, { chatId, fromId, username });
  if (!result.ok) {
    await sendTelegramMessage(chatId, `任務失敗 ${result.errorCode}: ${result.message}`);
    return res.status(result.httpStatus || 500).json({
      ok: false,
      error_code: result.errorCode,
      message: result.message,
    });
  }

  let reply = "完成";
  if (parsed.action === "create") reply = `已建立任務: ${result.data?.id || "(ok)"}`;
  if (parsed.action === "run") reply = `已啟動執行: ${result.data?.id || "(ok)"}`;
  if (parsed.action === "rerun") reply = `已重跑: ${result.data?.id || "(ok)"}`;
  if (parsed.action === "get") reply = `任務查詢完成: ${JSON.stringify(result.data)}`;
  if (parsed.action === "list") reply = `任務列表: ${JSON.stringify(result.data)}`;

  await sendTelegramMessage(chatId, reply);
  return res.json({ ok: true, action: parsed.action, data: result.data });
});

app.post(
  "/webhook/openclaw-result",
  async (req, res) => {
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    const verified = verifyWebhookHeaders(req.headers, rawBody);
    if (!verified.ok) {
      return res.status(verified.httpStatus || 401).json({
        ok: false,
        error_code: verified.errorCode,
        message: verified.message,
      });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({
        ok: false,
        error_code: "E1004",
        message: "invalid json body",
      });
    }

    const { task_id, run_id, status, output, error, finished_at } = payload;
    if (!task_id || !run_id || !status) {
      return res.status(400).json({
        ok: false,
        error_code: "E1003",
        message: "missing required fields: task_id/run_id/status",
      });
    }

    const patchRes = await taskApi(`/api/runs/${run_id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        output: output || null,
        error: error || null,
        finished_at: finished_at || new Date().toISOString(),
      }),
    });
    if (!patchRes.ok) {
      return res.status(patchRes.httpStatus || 502).json({
        ok: false,
        error_code: patchRes.errorCode,
        message: patchRes.message,
      });
    }

    return res.json({ ok: true });
  }
);

app.use((err, _req, res, _next) => {
  console.error("[unhandled]", err);
  return res.status(500).json({
    ok: false,
    error_code: "E5001",
    message: "internal error",
  });
});

app.listen(PORT, () => {
  console.log(`[bridge] listening on http://localhost:${PORT}`);
  console.log(`[bridge] task api base = ${TASK_API_BASE}`);
});
