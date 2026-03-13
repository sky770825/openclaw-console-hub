# 下一步行動計畫
**日期**: 2026-02-12  
**基於**: AI Agent Framework Strategy + Multi-Agent Strategy + 市場調查

---

## 一、MVP 開發第一步（本週可執行）

### Day 1-2: 環境與模型配置
| 任務 | 具體動作 | 預估時間 |
|------|---------|---------|
| 註冊 OpenRouter | 取得 API Key，測試免費模型 | 30 min |
| 配置 Fallback 鏈 | 設定 Kimi K2.5 → OpenRouter Free → Ollama | 1 hr |
| 建立 GitHub Repo | 初始化專案（建議名稱: AgentForge）| 30 min |
| 編輯 openclaw.json | 加入 OpenRouter provider 配置 | 30 min |

### Day 3-5: 核心基礎設施
| 任務 | 具體動作 | 預估時間 |
|------|---------|---------|
| Token 追蹤 | 建立 `token-usage.jsonl` 記錄機制 | 2 hr |
| Session 監控 | 實作 `session_status --all` 列出活躍 Session | 2 hr |
| Context 警告 | 設定使用率 >70% 時 Telegram 通知 | 2 hr |
| 測試並發 | 驗證 5 個子 Agent 同時運行 | 1 hr |

### 輸出成果
- [ ] 可運行的 Multi-Agent 環境（零成本）
- [ ] Token 使用可追蹤
- [ ] 基礎監控機制就緒

---

## 二、Cursor Agent 可直接開工的任務

### 立即指派（無需等待架構）
| 任務 | 說明 | 預估工時 |
|------|------|---------|
| **Agent Core Engine** | Agent 定義 YAML/JSON 解析器 | 4-6 hr |
| **Skill System 基礎** | 重用 skillforge-publisher 建立 Skill 載入機制 | 4-6 hr |
| **LLM Adapter** | 統一介接層（Ollama/OpenAI/OpenRouter）| 3-4 hr |
| **Token Tracker** | 記錄各模型使用量的模組 | 2-3 hr |
| **Playwright 整合** | 瀏覽器自動化基礎封裝 | 3-4 hr |

### 下週指派（需基礎設施就緒）
| 任務 | 說明 | 預估工時 |
|------|------|---------|
| **BullMQ Task Queue** | 任務排程與去重機制 | 4-6 hr |
| **Simple Orchestrator** | Hub-and-Spoke 中控系統 | 6-8 hr |
| **Circuit Breaker** | 熔斷器機制（失敗 5 次自動停用）| 3-4 hr |
| **Context Compressor** | 自動摘要超長上下文 | 3-4 hr |

---

## 三、商業化最快路徑

### 市場結論（根據調查）
- **熱門技能**: Coding automation > Web scraping > File management
- **競爭定價**: $9-$99/月為主流，$9/$29/$79 三階具競爭力
- **需求痛點**: 開發者想要「開箱即用的本地 AI Agent 自動化」

### 最快變現路徑
```
Week 1-2:   建立核心框架
Week 3-4:   開發 3 個熱門 Skills（GitHub、CLI、爬蟲）
Week 5-6:   GitHub 開源 + 文件
Week 7-8:   內部專案驗證
Month 3:    發布 Pro 版（$9/月）
```

### 商業模式建議
| 階段 | 產品 | 定價 | 目標 |
|------|------|------|------|
| **免費層** | 開源核心 + 基礎 Skills | $0 | 獲取開發者用戶 |
| **Pro** | 雲端執行 + 進階 Skills | $9/月 | 個人開發者 |
| **Team** | 多人協作 + 進階監控 | $29/月 | 小團隊 |
| **Enterprise** | 私有部署 + SLA | $79+/月 | 企業客戶 |

---

## 四、立即執行清單

### 今晚（1-2 小時）
- [ ] 註冊 OpenRouter 取得 API Key
- [ ] 編輯 `~/.openclaw/openclaw.json` 加入 OpenRouter
- [ ] 測試 `openrouter/openrouter/free` 模型
- [ ] 驗證 Kimi → OpenRouter → Ollama Fallback 鏈

### 本週（4-6 小時）
- [ ] 建立 GitHub Repo（AgentForge 或 AutoClaw）
- [ ] 實作 Token 使用記錄（`token-usage.jsonl`）
- [ ] 建立 `session_status --all` 功能
- [ ] 設定 Context >70% 警告通知
- [ ] 測試 5 個子 Agent 並發運行

### 下週（8-12 小時）
- [ ] Cursor Agent 開工：Agent Core Engine
- [ ] Cursor Agent 開工：LLM Adapter
- [ ] 安裝 BullMQ + Redis（本地）
- [ ] 實作 Simple Orchestrator
- [ ] 建立 3 個基礎 Skills 範例

---

## 五、關鍵資源配置

### 零成本技術棧
```yaml
主力模型: Kimi K2.5 (免費)
備用模型: OpenRouter Free
本地模型: Ollama Qwen3 8B
開發工具: Cursor + CoDEX
任務排程: BullMQ + Redis (本地)
監控: 自建腳本 + Cron
```

### 預估總投入
| 項目 | 成本 | 說明 |
|------|------|------|
| API 費用 | $0 | 使用免費模型 |
| OpenRouter 充值 | $10（可選）| 提升日限額至 1000 次 |
| 開發工具 | $20/月 | Cursor Pro |
| 硬體 | $0 | 現有 M2 Pro 16GB |
| **總計** | **$10-30** | 一次性 + 月費 |

---

## 六、成功指標

### Phase 1 驗證目標（2-3 個月）
| 指標 | 目標 | 驗證方式 |
|------|------|---------|
| GitHub Stars | 100+ | 開源發布後 3 個月 |
| 活躍用戶 | 50+ | Discord/社群註冊 |
| 內部專案使用 | 3 個 | 達爾團隊實際使用 |
| 技能數量 | 5+ | 基礎 Skills 範例 |

### 退出機制
| 條件 | 行動 |
|------|------|
| 3 個月無技術突破 | 暫停開發，評估轉向 |
| 6 個月無用戶增長 | 縮減範圍，專注單一場景 |
| 12 個月無收入 | 轉為純開源項目 |

---

**結論**: 立即執行環境配置，本週讓 Cursor Agent 開工核心模組，目標 2 個月內有可展示的 MVP。
