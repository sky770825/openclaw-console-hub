# 程式碼風格指南 v0.1

> 本文件定義了我們所有專案的程式碼撰寫標準，旨在提升程式碼的可讀性、可維護性和一致性。所有 Agent 和開發者都應遵循此指南。

---

## 1. 通用原則 (General Principles)

- **清晰勝於簡潔 (Clarity over Brevity)**: 程式碼首先是寫給人看的。優先選擇清晰易懂的變數名和邏輯，而非最短的寫法。
- **單一職責原則 (Single Responsibility Principle)**: 每個函式、每個模組都應該只做好一件事。
- **避免魔法數字 (Avoid Magic Numbers)**: 將常數定義為具名變數，增加程式碼的可讀性。
- **註解應解釋「為何」，而非「如何」**: 好的程式碼本身就能解釋它在做什麼 (How)，註解應該用來解釋背後的商業邏輯或設計決策 (Why)。
- **保持一致性 (Consistency is Key)**: 遵循檔案中現有的風格。如果沒有，則遵循本指南。

---

## 2. TypeScript/JavaScript 風格

我們採用業界廣泛使用的 [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript) 作為基礎，並補充以下核心規則：

- **命名 (Naming)**:
    - `camelCase` 用於變數和函式 (e.g., `taskExecutor`)。
    - `PascalCase` 用於類別和類型 (e.g., `TaskRunner`, `type TaskConfig`)。
    - `UPPER_CASE_SNAKE` 用於常數 (e.g., `const MAX_RETRIES = 3`)。
- **模組 (Modules)**:
    - 始終使用 `import` 和 `export`，而不是 `require`。
    - 檔案頂部先導入外部套件，然後是內部模組。
- **類型 (Types)**:
    - 盡可能使用 `interface` 定義物件結構，`type` 用於聯合類型或元組。
    - 避免使用 `any`，除非絕對必要。使用 `unknown` 進行更安全的類型檢查。
- **格式化 (Formatting)**:
    - 使用 `prettier` 自動格式化程式碼，縮排使用 2 個空格。
    - 每行最大長度為 100 個字元。

---

## 3. Bash 腳本風格

- **Shebang**: 所有腳本都必須以 `#!/usr/bin/env bash` 開頭。
- **錯誤處理**:
    - 在腳本開頭使用 `set -eo pipefail`，確保在錯誤發生時立即退出。
    - 在需要時使用 `trap` 進行清理工作。
- **變數 (Variables)**:
    - 使用 `UPPER_CASE_SNAKE` 命名全域常數。
    - 使用 `lower_case_snake` 命名函式內部的區域變數。
    - 引用變數時總是使用雙引號，防止 word splitting 和 globbing (e.g., `"Hello, $name"`).
- **函式 (Functions)**:
    - 使用 `main()` 函式作為腳本的進入點。
    - 函式內部使用 `local` 關鍵字宣告變數，避免污染全域範圍。

---
*版本: v0.1 | 建立時間: 2026-02-12 | 負責: ArchGuard*
