# 前端開發與 AI Agent 任務管理學習筆記

> 整理日期：2026-02-15
> 用途：個人學習與團隊知識共享

---

## 1. React + Tailwind 常見陷阱

### 1.1 動態 className 失效問題

#### 問題描述
使用模板字符串動態生成 Tailwind class 時會失效：
```jsx
// ❌ 錯誤寫法 - Tailwind 無法解析
function Button({ color, children }) {
  return <button className={`bg-${color}-600 hover:bg-${color}-500`}>{children}</button>;
}
```

#### 原因
Tailwind CSS 在編譯時會掃描源碼中**完整的 class 名稱**，動態生成的字符串不會被識別，因此不會生成對應的 CSS。

#### 解決方案

**方案一：使用完整的 class 名稱映射（推薦）**
```jsx
function Button({ color, children }) {
  const colorVariants = {
    blue: 'bg-blue-600 hover:bg-blue-500',
    red: 'bg-red-600 hover:bg-red-500',
    green: 'bg-green-600 hover:bg-green-500',
  };
  
  return <button className={colorVariants[color]}>{children}</button>;
}
```

**方案二：使用 CSS 變數**
```jsx
function Button({ color, children }) {
  return (
    <button 
      className="bg-[var(--btn-color)] hover:opacity-90"
      style={{ '--btn-color': color }}
    >
      {children}
    </button>
  );
}
```

**方案三：使用 safelist（tailwind.config.js）**
```js
module.exports = {
  safelist: [
    'bg-red-600',
    'bg-blue-600',
    'bg-green-600',
  ]
}
```

### 1.2 響應式設計最佳實踐

#### Mobile-First 原則
```jsx
// ✅ 正確：從小螢幕開始，逐步增強
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* 內容 */}
</div>
```

#### 常用斷點記憶
| 斷點 | 尺寸 | 用途 |
|------|------|------|
| `sm:` | 640px+ | 大號手機 |
| `md:` | 768px+ | 平板 |
| `lg:` | 1024px+ | 小型桌面 |
| `xl:` | 1280px+ | 標準桌面 |
| `2xl:` | 1536px+ | 大螢幕 |

### 1.3 常見 UI Bug 與修復方法

| Bug | 原因 | 修復方法 |
|-----|------|----------|
| 樣式不生效 | class 拼寫錯誤或 Purge 移除 | 檢查 class 名稱，使用 safelist |
| 響應式失效 | 忘記加斷點前綴 | 確認使用 `md:`、`lg:` 等前綴 |
| 自定義顏色無效 | 未在 config 定義 | 在 tailwind.config.js 中添加 |

---

## 2. 如何寫好技術任務卡

### 2.1 任務拆分的原則

#### 「多小算小」原則
- **單一職責**：一個任務只做一件事
- **可驗收性**：完成後有明確的驗收標準
- **時間盒**：單個任務建議 2-8 小時完成
- **獨立性**：盡量減少與其他任務的依賴

### 2.2 驗收標準怎麼定

#### 3C 原則
- **Card（卡片）**：簡短描述需求
- **Conversation（對話）**：討論細節
- **Confirmation（確認）**：驗收標準

#### Gherkin 格式（BDD）
```gherkin
Given 用戶已登入系統
When 點擊「新增用戶」按鈕
Then 應顯示用戶創建表單
```

### 2.3 給 AI Agent 的任務卡範例

```markdown
## 任務：實作登入表單組件

### 背景
需要在登入頁面添加一個表單，讓用戶輸入帳號密碼。

### 需求描述
創建一個 React 組件 `LoginForm`，包含：
- 帳號輸入框（Email 格式驗證）
- 密碼輸入框（至少 8 字元，顯示/隱藏切換）
- 登入按鈕（載入狀態顯示）
- 錯誤訊息顯示區域

### 驗收標準
- [ ] 輸入框有正確的 label 和 placeholder
- [ ] Email 格式錯誤時顯示紅色提示
- [ ] 密碼少於 8 字元時顯示錯誤
- [ ] 點擊眼睛圖標可切換密碼顯示/隱藏
- [ ] 點擊登入時顯示載入 spinner
- [ ] 使用 Tailwind CSS 進行樣式設計
- [ ] 組件有基本的中文註解

### 技術限制
- 使用 React Hook Form 處理表單
- 使用 Lucide React 作為圖標庫
- 不要修改現有的路由結構

### 預估工時
4 小時
```

---

## 3. AI Agent 任務分配策略

### 3.1 什麼任務適合發給誰

| 任務類型 | 推薦模型 | 原因 |
|----------|----------|------|
| **UI/前端開發** | Gemini 2.5 Pro / Cursor Agent | 視覺理解強，適合組件開發 |
| **後端 API 開發** | Codex / GPT-5.1 Codex | 邏輯嚴謹，適合複雜業務 |
| **Bug 修復** | Codex Native | 上下文理解深，擅長定位問題 |
| **代碼重構** | Claude Code | 遵循最佳實踐，輸出整潔 |
| **快速原型** | Gemini Flash | 免費且速度快 |
| **離線/敏感環境** | Ollama (本地) | 數據不出本地，零成本 |

### 3.2 如何防止 AI 亂改程式碼

#### 防護策略

**1. 範圍限制**
- 只修改指定目錄下的文件
- 不要修改核心配置或路由
- 如需修改其他文件請先詢問

**2. 增量修改原則**
- 每次只修改一個功能點
- 修改後運行測試確認通過再繼續
- 保持現有代碼風格一致

**3. 備份與回滾**
```bash
# 修改前創建分支
git checkout -b ai-feature-login

# 使用 --patch 模式審查每處修改
git add --patch
```

### 3.3 Code Review 流程設計

#### AI 產出代碼的審查流程

```
AI 生成代碼 → 自動檢查 → 人工 Review → 合併/退回
                  ↓
            ESLint / Type Check / 單元測試
```

---

## 4. Dashboard UI 設計原則

### 4.1 常見錯誤與反模式

| 反模式 | 錯誤做法 | 正確做法 |
|--------|----------|----------|
| 資訊過載 | 顯示 20+ 個 KPI | 優先顯示 Top 5 |
| 圖表濫用 | 所有數據用圓餅圖 | 趨勢用折線、占比用圓餅 |
| 顏色混亂 | 隨意使用顏色 | 建立顏色系統 |
| 忽視空白 | 元素緊貼邊緣 | 使用 8px 網格系統 |

### 4.2 按鈕互動設計最佳實踐

#### 按鈕狀態設計
| 狀態 | 視覺表現 | 用途 |
|------|----------|------|
| Default | 正常顏色 | 初始狀態 |
| Hover | 亮度變化 | 鼠標懸停 |
| Active | 按下效果 | 點擊中 |
| Disabled | 灰階 | 不可操作 |
| Loading | Spinner | 處理中 |

#### 按鈕設計原則
- ✅ 標籤清晰：使用動作詞如「保存」、「發送」
- ✅ 大小適中：點擊區域至少 44x44px
- ✅ 視覺層級：重要按鈕更突出
- ❌ 避免使用紅色於非破壞性操作
- ❌ 避免只有圖標沒有文字

### 4.3 狀態管理基礎

#### 選擇狀態管理方案

| 方案 | 適用場景 | 特點 |
|------|----------|------|
| **useState** | 組件內部狀態 | 最簡單，優先使用 |
| **Context API** | 跨組件共享 | 內建，無額外依賴 |
| **Zustand** | 全局狀態 | 輕量，API 簡潔 |
| **Redux** | 大型應用 | 生態完善 |
| **React Query** | 服務器狀態 | 自動緩存 |

---

## 參考資料

1. [Tailwind CSS Content Configuration](https://tailwindcss.com/docs/content-configuration)
2. [Atlassian User Stories Guide](https://www.atlassian.com/agile/project-management/user-stories)
3. [Agentic CLI Tools Comparison](https://getstream.io/blog/agentic-cli-tools/)
4. [Button States UX - NN/G](https://www.nngroup.com/articles/button-states-communicate-interaction/)
5. [React State Management 2024](https://dev.to/nguyenhongphat0/react-state-management-in-2024-5e7l)

---

*最後更新：2026-02-15*
