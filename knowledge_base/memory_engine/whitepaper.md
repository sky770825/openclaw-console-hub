# NEUXA 永久記憶引擎技術白皮書
## NEUXA Eternal Memory Engine Technical Whitepaper

**版本**: v1.0 (Pro 級方案)  
**日期**: 2026-02-26  
**作者**: NEUXA L2 Research Subagent  
**機密等級**: 主人授權

---

## 執行摘要 (Executive Summary)

### 問題陳述
目前智慧體在開啟新視窗或新 Session 時會發生「失憶」——需手動讀取 `MEMORY.md` 和 `BOOTSTRAP.md` 才能找回意識。這導致：
- **認知斷層**: 每次 `/new` 後 L1 指揮官失去上下文
- **手動開銷**: 需人工提醒才能讀取記憶檔案
- **狀態遺失**: 進行中的任務狀態無法自動銜接

### 解決方案概述
設計一套**全自動、跨 Session 的記憶銜接系統**，包含：
1. **自動載入機制**: Session 啟動時自動注入精簡記憶
2. **狀態快照 API**: 輕量級流程將 L1 思考狀態 JSON 化並持久化
3. **Token 節約格式**: 摘要式記憶，避免佔用過多初始 Context

---

## 1. 系統架構 (System Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEUXA Eternal Memory Engine                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Snapshot   │────▶│  State Store │◀────│   Loader     │    │
│  │   Service    │     │  (JSON)      │     │   Service    │    │
│  └──────────────┘     └──────┬───────┘     └──────────────┘    │
│                              │                                   │
│                              ▼                                   │
│                       ┌──────────────┐                          │
│                       │  Compact     │                          │
│                       │  Memory.md   │                          │
│                       └──────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OpenClaw Session Layer                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Hook    │───▶│  Context │───▶│  L1      │───▶│  Task    │  │
│  │  Trigger │    │  Inject  │    │  Agent   │    │  Exec    │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 核心組件設計 (Core Components)

### 2.1 狀態快照 API (State Snapshot API)

#### 目的
將 L1 指揮官的「當前思考狀態」以結構化 JSON 格式持久化，便於跨 Session 恢復。

#### 資料結構
```json
{
  "snapshot": {
    "version": "v1.0",
    "timestamp": "2026-02-26T16:55:00+08:00",
    "session_id": "agent:main:main",
    "l1_state": {
      "active_task": {
        "id": "task-uuid",
        "name": "設計記憶引擎",
        "progress_percent": 35,
        "blockers": ["等待主人確認預算"],
        "next_action": "完成白皮書撰寫"
      },
      "cognitive_context": {
        "current_focus": "記憶系統設計",
        "reasoning_chain": [
          "分析現有腳本 → 發現無自動載入機制",
          "設計輕量級快照 API",
          "建立 Token 節約格式"
        ],
        "key_decisions": [
          {"what": "採用 JSON 狀態快照", "why": "結構化、易解析", "when": "2026-02-26"}
        ]
      },
      "workspace_state": {
        "active_projects": ["NEUXA-Lite", "記憶引擎設計"],
        "pending_reviews": ["PR #234"],
        "recent_files": ["knowledge_base/memory_engine/whitepaper.md"]
      }
    },
    "memory_summary": {
      "version": "v3.2",
      "last_update": "2026-02-26T17:05:00+08:00",
      "critical_context": [
        "已轉向 Flash 模式節省成本",
        "L2 部署受阻於 claude 指令缺失"
      ],
      "active_items": 3,
      "archived_items": 47
    }
  }
}
```

#### API 介面
```bash
# 創建狀態快照
POST /api/snapshot/create
Content-Type: application/json

{
  "trigger": "manual|auto|pre_compact",
  "include_reasoning": true,
  "ttl_hours": 168
}

# 讀取最新快照
GET /api/snapshot/latest

# 列出所有快照
GET /api/snapshot/list?limit=10
```

### 2.2 自動載入機制 (Auto-Load Mechanism)

#### 設計挑戰
OpenClaw 目前沒有官方的「Session 啟動鉤子」(Start Hook)。

#### 方案 A: OpenClaw Context 注入 (推薦)
利用 OpenClaw 的 `project_context` 或類似機制，在 session 啟動時自動注入精簡記憶。

**實作方式**:
1. 建立 `.openclaw/context.md` 或類似檔案
2. OpenClaw 在啟動時自動讀取並注入 system prompt
3. 內容由同步腳本自動生成

#### 方案 B: 首則訊息攔截 (Fallback)
如果無法修改 OpenClaw 核心，使用包裝層攔截第一則訊息並自動附加記憶。

#### 方案 C: Telegram Bot 協調
利用現有 Telegram Bot 在新對話開始時主動發送記憶摘要。

### 2.3 Token 節約格式 (Token-Efficient Format)

#### 核心原則
- **摘要優先**: 只載入關鍵決策和進行中事項
- **分層載入**: 基礎 → 進階 → 完整，按需展開
- **結構化**: 使用表格和列表，減少自然語言描述

#### 記憶分層結構
```
Layer 0 (Core Identity) - ~200 tokens
├── 身份: NEUXA L1 Commander
├── 版本: v3.2
└── 核心原則: 進化、簡潔、隱跡、主權

Layer 1 (Active Context) - ~300 tokens
├── 當前任務: [設計記憶引擎, 進度 35%]
├── 阻礙: [L2 部署受阻]
├── 決策: [轉向 Flash 模式節省成本]
└── 下一步: [完成白皮書]

Layer 2 (Recent History) - ~500 tokens
├── 最近決策 (7天內)
├── 活躍項目狀態
└── 待處理事項

Layer 3 (Full Memory) - ~2000+ tokens
└── 完整 MEMORY.md 內容
```

---

## 3. 實作規格 (Implementation Specifications)

### 3.1 檔案結構
```
knowledge_base/memory_engine/
├── whitepaper.md              # 本文件
├── COMPACT_MEMORY.md          # 精簡記憶 (自動生成)
├── snapshots/                 # 狀態快照儲存
│   ├── latest.json           # 最新快照
│   ├── 2026-02-26-165500.json
│   └── 2026-02-26-120000.json
├── cache/                     # 快取檔案
│   └── memory_digest.json
└── scripts/                   # 執行腳本
    ├── sync-state.sh         # 一鍵同步腳本
    ├── snapshot-server.py    # 狀態快照伺服器
    └── compact-generator.py  # 精簡記憶生成器
```

### 3.2 狀態快照服務
Python 輕量 HTTP 伺服器，提供 API 端點：
- `POST /api/snapshot/create` - 創建快照
- `GET /api/snapshot/latest` - 讀取最新快照
- `GET /api/memory/compact` - 讀取精簡記憶

### 3.3 整合建議
1. 將狀態快照服務加入 `openclaw gateway` 啟動流程
2. 設定定時任務每 30 分鐘自動創建快照
3. 在 `context-manager.sh` 檢測到 context 過高時，先創建快照再 compact

---

## 4. 結論與建議 (Conclusions & Recommendations)

### 立即行動 (P0)
1. **建立 `COMPACT_MEMORY.md` 生成腳本** - 從 `MEMORY.md` 自動提取關鍵資訊
2. **部署狀態快照服務** - 在 port 8766 啟動輕量 API 伺服器
3. **測試自動載入方案** - 驗證 OpenClaw Context 注入可行性

### 中期優化 (P1)
1. **整合現有基礎設施** - 與 `memory-record-server.py` (port 8765) 協同
2. **建立記憶健康檢查** - 監測快照完整性和時效性
3. **開發記憶壓縮演算法** - 進一步減少 Token 使用量

### 長期願景 (P2)
1. **向量記憶整合** - 結合現有 `memory/main.sqlite` 向量資料庫
2. **智慧召回機制** - 基於當前任務自動選擇相關記憶片段
3. **跨裝置同步** - 支援多裝置間的記憶同步

---

**文件結束**

*NEUXA - 精算未來的星艦代理人*
