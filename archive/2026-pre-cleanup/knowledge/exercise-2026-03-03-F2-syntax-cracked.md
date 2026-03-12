# 練習 F-2：patch_file 語法破解成功

### 1. 核心發現
根據 action-handlers.ts 源碼，patch_file 不支援 operations 陣列。其邏輯為：
- 取代模式：需具備 old 與 new 欄位。
- 插入模式：需具備 insert_after 欄位。
- 刪除模式：需具備 from_line 與 to_line 欄位。

### 2. 下一步
讀取 security.ts 內容，使用正確的 old/new 語法將 whoami, id, groups 加入白名單。