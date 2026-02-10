#!/usr/bin/env node
/**
 * 估算 bootstrap 的 token：現狀 vs 方案2（Notion/本機檢索取代大量載入）
 * 用法：node scripts/estimate-bootstrap-tokens.js [workspace目錄]
 * 若未傳目錄，會用環境變數 OPENCLAW_WORKSPACE 或 ~/.openclaw/workspace
 */

const fs = require("fs");
const path = require("path");

const BOOTSTRAP_FILES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "IDENTITY.md",
  "USER.md",
  "HEARTBEAT.md",
  "BOOTSTRAP.md",
  "MEMORY.md",
  "memory.md",
];

// 方案2：各檔「精簡後」目標字數（索引/短版，其餘改 Notion 或按需讀）
const TARGET_CHARS = {
  "MEMORY.md": 500,
  "memory.md": 500,
  "HEARTBEAT.md": 800,
  "SOUL.md": 1200,
  "AGENTS.md": 1200,
  "TOOLS.md": 600,
  "USER.md": 400,
  "IDENTITY.md": 324,
  "BOOTSTRAP.md": 200,
};

function getWorkspaceDir() {
  const arg = process.argv[2];
  if (arg) return path.resolve(arg);
  const env = process.env.OPENCLAW_WORKSPACE;
  if (env) return path.resolve(env);
  const home = process.env.HOME || process.env.USERPROFILE || ".";
  return path.join(home, ".openclaw", "workspace");
}

function countChars(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return raw.length;
  } catch {
    return 0;
  }
}

function main() {
  const workspaceDir = getWorkspaceDir();
  console.log("Workspace:", workspaceDir);
  console.log("");

  let currentTotal = 0;
  const rows = [];

  const seen = new Set(); // MEMORY.md / memory.md 常為同檔，只算一次
  for (const name of BOOTSTRAP_FILES) {
    const filePath = path.join(workspaceDir, name);
    const chars = countChars(filePath);
    if (chars === 0 && !fs.existsSync(filePath)) continue;
    const memKey = (name === "MEMORY.md" || name === "memory.md") ? "MEMORY" : name;
    if (seen.has(memKey)) continue;
    seen.add(memKey);

    const tokenEst = Math.ceil(chars / 1.0); // 中文為主 ≈ 1 char = 1 token
    currentTotal += tokenEst;
    const target = TARGET_CHARS[name];
    const afterChars = target != null ? Math.min(chars, target) : chars;
    const afterToken = Math.ceil(afterChars / 1.0);
    rows.push({
      name,
      chars,
      tokenEst,
      afterChars: target != null ? afterChars : chars,
      afterToken,
    });
  }

  const afterTotal = rows.reduce((s, r) => s + r.afterToken, 0);
  const saved = currentTotal - afterTotal;

  console.log("【現狀】bootstrap 檔案預估 token");
  console.log("----------------------------------------");
  rows.forEach((r) => {
    console.log(`  ${r.name.padEnd(14)} ${String(r.chars).padStart(6)} chars  → 約 ${r.tokenEst} token`);
  });
  console.log("----------------------------------------");
  console.log(`  合計（bootstrap 檔）        約 ${currentTotal} token`);
  console.log("");

  console.log("【方案2】精簡/索引後目標（其餘 Notion 或按需讀）");
  console.log("----------------------------------------");
  rows.forEach((r) => {
    const target = TARGET_CHARS[r.name];
    const note = target != null ? `  (目標 ${target} 字)` : "";
    console.log(`  ${r.name.padEnd(14)} ${String(r.afterChars).padStart(6)} chars  → 約 ${r.afterToken} token${note}`);
  });
  console.log("----------------------------------------");
  console.log(`  合計（bootstrap 檔）        約 ${afterTotal} token`);
  console.log("");
  console.log(`  預估可省：約 ${saved} token（僅 bootstrap 部分）`);
  console.log("");

  // 整輪 input 粗估：系統還含 template、tools schema、skills prompt
  const SYSTEM_OTHER = 5000; // 約 5k（template + tools + skills，不變）
  const firstRoundUser = 100;
  const currentFirst = currentTotal + SYSTEM_OTHER + firstRoundUser;
  const afterFirst = afterTotal + SYSTEM_OTHER + firstRoundUser;
  console.log("【第一輪 input 粗估】（bootstrap + 系統其餘 + 一則短訊息）");
  console.log(`  現狀：約 ${currentFirst} token`);
  console.log(`  方案2：約 ${afterFirst} token`);
  console.log("");
}

main();
