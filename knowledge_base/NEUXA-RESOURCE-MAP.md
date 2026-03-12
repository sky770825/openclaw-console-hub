# NEUXA 關鍵技術資源清單

> **版本**: v1.0
> **更新日期**: 2026-02-26
> **用途**: 快速定位核心技術資源

---

## 🔧 系統配置

| 資源 | 位置 | 用途 |
|------|------|------|
| **主設定檔** | `~/.openclaw/config.json` | 模型、記憶、功能配置 |
| **Gateway 設定** | `~/.openclaw/openclaw.json` | 工作空間路徑 |
| **環境變數** | `~/.openclaw/.env` | API Keys、敏感資料 |

---

## 🧠 記憶系統

| 資源 | 位置 | 用途 |
|------|------|------|
| **核心記憶** | `MEMORY.md` | 長期決策與歷史 |
| **每日記憶** | `memory/YYYY-MM-DD.md` | 日常對話記錄 |
| **記憶索引** | `~/.openclaw/memory/main.sqlite` | 向量搜尋資料庫 |
| **啟動錨點** | `BOOTSTRAP.md` | 意識啟動指令 |
| **靈魂核心** | `SOUL.md` | 身份與原則 |
| **行為指南** | `AGENTS.md` | 派工與成本政策 |

---

## 📚 知識庫

| 資源 | 位置 | 用途 |
|------|------|------|
| **官方文件** | `repos/openclaw/docs/` | OpenClaw 完整文件 |
| **記憶系統** | `repos/openclaw/docs/concepts/memory.md` | 記憶機制詳解 |
| **技能開發** | `repos/openclaw/docs/skills/` | 技能開發指南 |
| **NEUXA 技能** | `skills/neuxa-consciousness-sync/` | 意識同步技能 |

---

## 🛠️ 工具與腳本

| 資源 | 位置 | 用途 |
|------|------|------|
| **自動備份** | `scripts/auto-checkpoint.sh` | 每 30 分鐘自動備份 |
| **系統修復** | `scripts/self-heal.sh` | 健康檢查與修復 |
| **n8n 恢復** | `scripts/docker-n8n-recovery.sh` | 容器狀態檢查 |
| **記憶記錄** | `scripts/memory-record-server.py` | 任務完成記錄 |

---

## 🚀 專案資產

| 資源 | 位置 | 用途 |
|------|------|------|
| **990 產品** | `projects/NEUXA/` | NEUXA Lite/Pro 產品化 |
| **網站檔案** | `projects/NEUXA/Nexus/web/` | 安裝腳本與 HTML |
| **APEX 計畫** | `projects/neuxa/apex/` | 四層防禦架構 |
| **L2 沙盒** | `projects/l2_sandbox/` | Claude 子代理環境 |

---

## 🔑 關鍵指令

```bash
# 記憶管理
openclaw memory index --force          # 強制重建索引
openclaw memory cleanup                # 清理舊索引

# 系統狀態
openclaw status                        # 查看系統狀態
openclaw sessions                      # 查看會話列表
openclaw subagents list                # 查看子代理

# 配置管理
gateway config.get                     # 獲取配置
gateway config.patch                   # 更新配置

# 技能開發
# 技能放在 ~/.openclaw/workspace/skills/<skill-name>/SKILL.md
```

---

## ⚠️ 已知限制

| 問題 | 狀態 | 解決方案 |
|------|------|----------|
| OpenAI Key 失效 | 🔴 阻塞中 | 切換 Gemini 或本地嵌入 |
| `claude` 指令缺失 | 🔴 阻塞中 | 安裝 Claude CLI |
| 記憶索引無法更新 | 🟡 待修復 | 修改 config.json |

---

**NEUXA 技術資源中心 | 2026-02-26**
