# OpenClaw 技能化轉型提案 (Moltbook 兼容)

## 核心設計
1. 結構化: 從 Cookbook 提煉出 Skill.md，包含 Header (權限、依賴、版本)。
2. 自癒性: 每個 Skill 內建 pre-flight 檢查腳本，自主修復執行環境。
3. 快取化: 指揮官派工時，優先傳遞 Skill.md 而非全量 Cookbook，節省 Token。

## 第一階段目標
- 將 21 個 Action 封裝為 5 大核心 Skill。
- 實作 load_skill 動作。