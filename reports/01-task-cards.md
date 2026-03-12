# 技術任務卡撰寫指南

> 整理日期：2025-02-15  
> 資料來源：Atlassian、Smartsheet、Augment Code、PromptHub、OpenAI、Anthropic 等權威技術文檔

---

## 核心原則

### 1. **聚焦結果，而非實作方式**
接受標準（Acceptance Criteria）應該描述「要做什麼」，而非「怎麼做」。讓開發者保有技術決策的自由度。

> ✅ 「搜尋功能應該回傳與輸入產品名稱完全匹配的結果」  
> ❌ 「使用 Elasticsearch 實作搜尋功能」

### 2. **具體、可測試、可衡量**
每個條件都應該能轉換成明確的測試案例，避免模糊形容詞。

> ✅ 「搜尋結果頁面每頁顯示最多 20 個項目」  
> ❌ 「頁面載入要快、介面要友善」

### 3. **提供完整上下文（Context）**
AI Agent 無法讀取你腦中的資訊。必須明確提供環境資訊、限制條件、相關檔案位置。

> 關鍵要素：
> - 當前工作目錄
> - 作業系統環境
> - 相關檔案路徑
> - 既有程式碼結構

### 4. **步驟化與原子化**
將大任務拆解為小步驟，每個任務應該可以在 4-16 小時內完成（Scrum 建議）。

### 5. **使用 Given-When-Then 格式**
情境導向的驗收標準格式：
```
Given [前置條件/輸入資料]
When [觸發動作]
Then [預期結果]
```

---

## 好 vs 壞 對比

### ❌ 壞範例

#### 範例 1：模糊籠統
```
任務：優化網站效能

說明：
讓網站載入更快一點，使用者體驗要好。
```

**問題分析：**
- ❌ 「更快」沒有量化標準（是 1 秒還是 3 秒？）
- ❌ 「體驗要好」過於主觀，無法測試
- ❌ 沒有說明測試環境、測量工具
- ❌ 沒有界定範圍（是所有頁面還是特定頁面？）

---

#### 範例 2：矛盾與過度指定
```
任務：設計登入按鈕

需求：
1. 按鈕要是綠色且要醒目突出
2. 按鈕要與整體頁面設計融合
3. 必須使用特定 NoSQL 資料庫儲存使用者資料
4. 寫一個登入功能
```

**問題分析：**
- ❌ 需求 1 和 2 互相矛盾（醒目 vs 融合）
- ❌ 需求 3 過度指定技術實作（應該描述需要什麼功能，而非怎麼做）
- ❌ 需求 4 過於籠統，沒有任何驗收標準
- ❌ 沒有說明錯誤處理、安全性要求

---

### ✅ 好範例

#### 範例 1：API 開發任務卡
```markdown
## 任務：實作 SMS 發送 API 整合

### 背景
需要整合 Twilio SMS API 讓系統能自動發送通知簡訊給使用者。

### 驗收標準
- [ ] API 能發送簡訊到任何有效的手機號碼
- [ ] 系統記錄每則發送的訊息（時間戳記、狀態）
- [ ] 錯誤處理：無效號碼、API 限制、網路失敗
- [ ] 提供有意義的錯誤訊息給呼叫方

### 技術限制
- 使用既有 `config/twilio.yml` 設定檔
- 遵循現有 `app/services/` 目錄結構
- 必須包含單元測試（覆蓋率 > 80%）

### 相關檔案
- `app/services/sms_service.rb`（需建立）
- `spec/services/sms_service_spec.rb`（需建立）
- `config/twilio.yml`（已存在）

### Given-When-Then 範例
Given：使用者提供有效手機號碼 +1234567890
When：呼叫 `SMSService.send(to: number, message: text)`
Then：
- Twilio API 被呼叫
- 回傳訊息 ID
- 資料庫記錄建立（狀態：sent）
```

**優點分析：**
- ✅ 具體、可測試的驗收標準
- ✅ 明確指出錯誤處理情境
- ✅ 提供相關檔案路徑，減少探索時間
- ✅ 遵循既有程式碼結構

---

## 檢查清單

### 發任務前檢查

#### 基本資訊
- [ ] 標題清楚說明要做什麼（非籠統描述）
- [ ] 提供足夠的「為什麼」背景資訊
- [ ] 明確界定任務範圍（包含什麼、不包含什麼）

#### 驗收標準
- [ ] 每個標準都是具體、可測試的
- [ ] 沒有模糊形容詞（快、好、優化）
- [ ] 涵蓋正常流程與錯誤處理
- [ ] 使用 Checkbox 格式（- [ ]）

#### 技術細節
- [ ] 提供相關檔案路徑
- [ ] 說明技術限制或框架要求
- [ ] 標示相依任務或前置條件
- [ ] 提供環境資訊（OS、語言版本等）

#### 給 AI 的特別檢查
- [ ] 提供參考範例或類似實作
- [ ] 明確說明「不要做什麼」
- [ ] 提供驗證步驟（如何測試）
- [ ] 說明現有程式碼結構

#### 最後確認
- [ ] 自己讀一遍，確認理解無歧義
- [ ] 找同事快速 review（重要任務）
- [ ] 確認工時預估合理

---

## 參考資源

1. **[Atlassian - Acceptance Criteria Explained](https://www.atlassian.com/work-management/project-management/acceptance-criteria)**
2. **[Smartsheet - 80+ User Story Examples](https://www.smartsheet.com/content/user-story-with-acceptance-criteria-examples)**
3. **[Augment Code - 11 Prompting Techniques](https://www.augmentcode.com/blog/how-to-build-your-agent-11-prompting-techniques-for-better-ai-agents)**