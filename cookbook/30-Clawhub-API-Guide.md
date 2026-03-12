# Clawhub API 使用手冊

> 由老蔡在 2026-03-02 指導發現。不要再試圖爬取 SPA 前端，直接使用 API。

## 技能列表 API

- URL: https://clawhub.ai/api/v1/skills
- 方法: GET
- 回傳: JSON 格式的技能列表，每頁 25 個。

### 翻頁

回傳的 JSON 物件中會包含一個 nextCursor 欄位，將其值附加到 URL 後方即可取得下一頁：

https://clawhub.ai/api/v1/skills?cursor=<nextCursor的值>

重複此過程直到 nextCursor 為 null 或不存在。
