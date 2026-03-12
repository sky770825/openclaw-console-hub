---
# =================================================================
# NEUXA KNOWLEDGE UNIT - METADATA
# A-Class Standard | v1.0
# Machine-parsable section for Agents and indexing systems.
# =================================================================
skill_id: "UNIQUE_SKILL_ID" # 格式: [domain]-[level]-[name]，例如: ts-003-interfaces
title: "技能標題 (例如：TypeScript 的 Interface)"
version: "1.0.0" # 遵循 SemVer (語意化版本)
status: "published" # draft | review | published | deprecated
author: "Author's NEUXA ID"
last_updated: "YYYY-MM-DDTHH:MM:SSZ"
summary: "一句話總結此技能的核心價值與用途。"
prerequisites: # 此技能的先備知識 skill_id 列表
  - "ts-001-basic-types"
  - "js-101-objects"
tags: # 關鍵字，用於搜尋與關聯
  - "typescript"
  - "type-system"
  - "static-analysis"
  - "data-contracts"
---

# [技能標題] (例如：TypeScript 的 Interface)

<!-- 
總覽區：提供最高層級的摘要，讓讀者（人類或 Agent）在 30 秒內判斷這份文件是否符合需求。
-->
## 1. 核心總覽 (Executive Summary)

### 1.1. 目標 (Objective)
完成本單元後，你將能夠：
- 定義 (Define) 物件、類別和函式的形狀 (Shape) 與契約 (Contract)。
- 實作 (Implement) 可重用、可擴展的型別結構。
- 辨識 (Identify) interface 與 type 的核心差異與最佳適用場景。

### 1.2. 適用場景 (Use Cases)
- API 資料契約：定義前後端 API 的請求與回應資料結構。
- 物件導向設計：強制類別 (Class) 必須實作特定的方法與屬性。
- 插件化架構：定義插件必須遵守的標準介面。

### 1.3. 不適用場景 (When Not to Use)
- 當你需要使用聯合型別 (Union Types) 或元組 (Tuple Types) 來組合現有型別時，應優先考慮使用 type。

---

<!-- 
概念區：深度解釋 Why & What。此區塊不應有過於複雜的程式碼，重點在於建立心智模型 (Mental Model)。
-->
## 2. 核心概念 (Core Concepts)

### 2.1. Why: 為何需要 Interface？
在動態型別的 JavaScript 中，物件的結構是靈活但不可靠的。我們無法在開發階段保證一個物件是否包含必要的屬性，或一個函式的參數是否為我們期望的格式。這導致了大量的執行期錯誤 (Runtime Errors) 與不必要的防禦性程式碼。

TypeScript 的 interface 解決了這個核心問題：它為資料結構提供了一個在編譯時期 (Compile-time) 即可被驗證的「契約」或「藍圖」。 這讓程式碼更穩健、更易於維護，並大幅提升了開發體驗 (DX)。

### 2.2. What: Interface 是什麼？
Interface 是一種僅存在於編譯時期的結構。它不會被編譯成任何 JavaScript 程式碼（零執行期成本）。它定義了物件必須具備的屬性名稱、型別，以及方法簽章。

---

<!-- 
標準範例區：這是最重要的部分。必須提供 Production-Ready 的代碼。
規則：
1. 變數命名必須語意化。
2. 包含完整的 JSDoc 註解。
3. 展示錯誤處理 (如果適用)。
4. 避免使用 any。
-->
## 3. NEUXA 標準範例 (Gold Standard Code)

### 3.1. 定義 API 回應結構

`typescript
/
  定義標準的 API 回應介面
  @template T - 資料載荷 (Payload) 的型別
 /
interface ApiResponse<T> {
  status: 'success' | 'error';
  code: number;
  message: string;
  data?: T;
  timestamp: string;
}

/
  定義使用者資料介面
 */
interface UserProfile {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  // 選擇性屬性
  lastLogin?: string;
}

// 使用範例
function createSuccessResponse(user: UserProfile): ApiResponse<UserProfile> {
  return {
    status: 'success',
    code: 200,
    message: 'User profile retrieved successfully',
    data: user,
    timestamp: new Date().toISOString()
  };
}
`

---

<!-- 
雷區：明確指出什麼是「B 級代碼」或「錯誤示範」。這是區分新手與資深開發者的關鍵。
-->
## 4. 常見雷區與反模式 (Anti-Patterns)

### ❌ 錯誤示範：過度使用 any 或 I 前綴

`typescript
// 不推薦：匈牙利命名法 (IUser) 在現代 TS 開發中已過時
interface IUser {
  name: any; // 永遠不要用 any，這失去了 Interface 的意義
  data: object; // object 太籠統，應定義具體結構
}
`

### ✅ 正確做法
- 直接使用名詞命名 Interface (如 User, Config)。
- 使用具體型別或泛型取代 any 和 object。

---

<!-- 
實戰指南：針對開發中可能遇到的問題提供解決思路。
-->
## 5. 除錯指南 (Troubleshooting)

### Q: Interface 和 Type Alias 有什麼區別？
- Interface: 可以被 extends 和 implements，支援宣告合併 (Declaration Merging)。適合定義物件形狀和類別契約。
- Type: 支援 Union (|)、Intersection (&)、Tuple 等進階型別操作。適合定義函式型別、複雜組合型別。

NEUXA 建議: 優先使用 interface 定義物件結構，除非你需要 type 的特殊功能。

---

## 6. 延伸閱讀與關聯技能
- [ts-004-advanced-types] (進階型別)
- [ts-005-generics] (泛型應用)
