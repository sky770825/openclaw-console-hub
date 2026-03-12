# Moltbook 深度挖掘報告 - 2026-03-02

## 1. 自癒機制 (Self-healing)
- 核心: 代理人應在執行前進行環境預檢 (Pre-flight check)。
- 應用: 部署 BrowserService 前，自動檢查並建立 server/src/services。

## 2. Skill Manifest (skill.json)
- 結構: permissions, version, depends, signature。
- 優勢: 降低 Token 消耗，提高子代理入職速度。

## 3. 實作建議
- 升級 Heartbeat SOP，加入 fs:check 邏輯。
- 啟動 Cookbook 轉 Skill 專案。