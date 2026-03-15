# 新代理上線清單 v1.0

> 新增一個代理到星群時，必須完成以下所有步驟
> 阿策負責規劃、阿秘負責追蹤

---

## 上線前準備（阿策主導）

### 1. 角色定義
- [ ] 確定代理代號（小寫英文，2-8 字母）
- [ ] 確定中文名稱和角色說明
- [ ] 確定使用的模型（gemini / claude / 其他）
- [ ] 確定上下游關係（誰給它任務、它產出給誰）

### 2. 目錄結構建立（阿工執行）
```bash
crew/{代號}/
├── PLAYBOOK.md        # 個人劇本（角色+職責+情境）
├── RULES.md           # 行為規範
├── MEMORY.md          # 記憶索引
├── knowledge/         # 知識庫（至少 5 個檔案）
│   ├── tools-reference.md
│   ├── workflow-examples.md
│   └── {專業知識 x3+}.md
├── inbox/             # 任務收件匣
│   └── README.md
└── notes/             # 工作筆記
```

### 3. 必備檔案內容

**PLAYBOOK.md 必須包含：**
- 角色定位（一句話）
- 核心職責（3-5 項）
- 觸發條件（什麼情況下該代理動起來）
- 交付物標準
- 常用 actions

**RULES.md 必須包含：**
- 基本行為規範
- 品牌資訊引用規則
- 禁止事項
- 交付格式要求

---

## 系統整合（阿工 + 阿秘）

### 4. 更新全局設定
- [ ] 更新 `crew/PLAYBOOK.md` 團隊總覽表
- [ ] 更新 `shared/COMMUNICATION-STYLES.md` 新增溝通風格
- [ ] 更新 `shared/DELIVERY-FORMAT.md` 如有新交付類型
- [ ] 更新 `scripts/task-router.sh` 關鍵字路由
- [ ] 更新 `scripts/agent-scheduled-tasks.sh` 如需排程

### 5. 上下游對接
- [ ] 上游代理知道新代理的存在和能力
- [ ] 下游代理知道會收到什麼格式的輸入
- [ ] delivery-pipeline.md 如需要，加入新環節

### 6. 知識庫初始化
- [ ] `tools-reference.md` — 可用工具和用法
- [ ] `workflow-examples.md` — 工作流範例
- [ ] 至少 3 個專業知識檔案（每個 > 500 bytes）
- [ ] 檔案命名符合規範（小寫英文+連字號）

---

## 驗證測試（巡查 + 審查）

### 7. 冒煙測試
- [ ] 給新代理一個簡單 inbox 任務
- [ ] 確認代理能讀取自己的 knowledge/
- [ ] 確認交付物符合 DELIVERY-FORMAT 三段式
- [ ] 確認溝通風格符合 COMMUNICATION-STYLES

### 8. 整合測試
- [ ] 上游代理能正確寫入新代理 inbox
- [ ] 新代理能正確交接給下游
- [ ] task-router 能正確路由到新代理
- [ ] 巡查能看到新代理的任務狀態

---

## 上線後（阿秘追蹤）

### 9. 首週觀察
- [ ] 前 3 天每天檢查新代理的產出品質
- [ ] 收集其他代理的反饋
- [ ] 知識庫是否需要補充

### 10. 正式編入
- [ ] 更新 `memory/project_10agents.md`（如適用）
- [ ] 日誌記錄新代理上線事件
- [ ] 通知主人新代理已就位
