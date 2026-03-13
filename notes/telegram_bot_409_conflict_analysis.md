# Telegram Bot 409 衝突錯誤分析報告

## 問題描述

使用者回報 Telegram Bot 無法正常運作。

## 分析過程

1.  **檢查日誌**：執行 `tail -50 /Users/sky770825/.openclaw/logs/server.log` 來觀察最新的日誌。
2.  **發現錯誤**：日誌中反覆出現關鍵錯誤訊息：`Error: 409 Conflict: terminated by another getUpdates request`。

## 結論

這個 `409 Conflict` 錯誤明確指出，系統中存在多個使用相同 Bot Token 的進程在同時運行。Telegram 的 `getUpdates` 方法（一種稱為「長輪詢」的技術）一次只允許一個客戶端連接。當第二個實例嘗試連接時，Telegram 會終止前一個連接，導致兩個（或多個）實例相互衝突，無法穩定接收訊息。

## 解決方案

根本的解決方法是確保任何時候都只有一個 Bot 實例在運行。

1.  **識別重複進程**：使用 `ps aux | grep telegram` 或類似命令來查找所有相關的進程。
2.  **終止所有進程**：使用 `kill` 命令終止所有找到的重複進程。
3.  **重新啟動**：以乾淨的狀態重新啟動 Bot 服務，確保只啟動一個實例。
