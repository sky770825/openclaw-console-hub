# Skill: 自癒型部署 (Self-healing Deploy)

## 核心邏輯
在執行任何部署或檔案寫入動作前，必須先執行環境預檢 (Pre-flight check)。

## 實作指令
- mkdir -p server/src/services : 確保服務目錄存在
- mkdir -p server/src/routes : 確保路由目錄存在

## 適用場景
解決 BrowserService 部署失敗或任何目錄缺失導致的 F-級錯誤。