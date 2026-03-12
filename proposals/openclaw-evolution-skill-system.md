# 提案：OpenClaw 技能系統標準化 (Moltbook 兼容)

## 核心痛點
目前我們的 cookbook/ 檔案過於冗長，且缺乏結構化元數據，導致 AI 呼叫時 Token 浪費嚴重，且難以讓子代理快速學會。

## 轉型方案
1. 格式轉型: 所有核心能力從 cookbook 提煉成 skills/*.md，必須包含 YAML Header。
2. 動態掛載: 實作 load_skill 動作，讓子代理只需讀取 1k tokens 的 skill 檔案即可開工。
3. Clawhub 接軌: 這種格式未來可以直接在 Clawhub.ai 上架，實現「技能即產品」。

## 下一步動作
- [ ] 將 21 個 NEUXA Action 分類封裝成 5 個核心 Skill 檔案。
- [ ] 在 AGENTS.md 中加入技能掛載協議。