# 留言系統技術概覽：utterances 實作

## 前言
這份文件記錄了如何使用 utterances 這個小工具，在既有的 Github Page 上建立留言回覆系統。這對於使用靜態網頁部落格（如 Github Page）的作者來說，是一個輕量且高效的留言解決方案。

## 留言系統的好處
儘管靜態網頁能夠發布內容，但留言系統能顯著提升作者與讀者之間的互動性，增加寫作的成就感，並提供讀者與作者直接溝通的管道，解決內容上的疑問。

## 為什麼選擇 utterances
過去使用 DISQUS 等工具，常會遇到免費版插入廣告影響使用者體驗的問題。utterances 則完美解決了這個痛點，它利用 GitHub Repo 的 Issue 功能作為留言板的存放地，所有網頁的留言都會以貼文為單位，存放在 Issue 中，與 Github Page 整合度高。

## utterances 技術實現原理
utterances 的核心概念是將 GitHub 儲存庫的 Issues API 作為留言系統的後端。當使用者在網頁上留言時，utterances 會：
1.  自動在指定的 GitHub Repo 中創建一個新的 Issue（如果該網頁還沒有對應的 Issue）。
2.  將留言內容作為該 Issue 的一個 Comment 儲存。
3.  當網頁加載時，utterances 會從 GitHub API 讀取對應 Issue 下的所有 Comment，並將其顯示為留言。

## 設定步驟
1.  安裝 utterances GitHub App：首先需要在 GitHub 上安裝 utterances App，並授權它訪問你的儲存庫。
2.  新增 script 標籤：將以下 HTML 片段加入你的網頁中，通常是在文章內容的結尾處：
    ``html
    <script src="https://utteranc.es/client.js"
            repo="[YOUR_GITHUB_USER_OR_ORG]/[YOUR_REPO]" <!-- 你的 GitHub 儲存庫 -->
            issue-term="pathname" <!-- 留言對應的 Issue 規則 (e.g., pathname, url, title, og:title) -->
            label="comment" <!-- 給 Issue 加上標籤 -->
            theme="github-light" <!-- 留言區塊主題 -->
            crossorigin="anonymous"
            async>
    </script>
    `

## 主要設定選項
   repo：指定用作留言儲存的 GitHub 儲存庫（格式為 owner/repo）。
   issue-term：定義如何將留言與 GitHub Issue 關聯。常見選項包括：
       pathname：使用網頁的路徑作為 Issue 標題。
       url：使用網頁的完整 URL 作為 Issue 標題。
       title：使用網頁的 HTML <title> 標籤內容作為 Issue 標題。
       og:title：使用 Open Graph og:title 作為 Issue 標題。
       issue-number：直接指定一個 Issue 號碼。
       url-specific-comment：用於特殊情況下的自定義關聯。
   label：給所有由 utterances 創建的 Issue 加上一個標籤，方便管理。
   theme：自定義留言區塊的視覺主題。

## 優點與適用情境
   免費且無廣告：基於 GitHub，完全免費且沒有第三方廣告。
   與 Git 生態整合：留言數據儲存在 GitHub 儲存庫的 Issue 中，便於版本控制和管理。
   易於部署：只需一個 script` 標籤即可整合。
   隱私與安全：數據儲存在 GitHub 上，遵循 GitHub 的隱私政策。
   適用於靜態網站：是 Github Page、Jekyll、Hugo 等靜態網站的最佳留言解決方案之一。

## 限制
   依賴 GitHub：如果 GitHub 服務不可用，留言功能也會受影響。
   非即時通訊：本質上是基於 Issue 的，不適合即時聊天場景。
   需要 GitHub 帳號：使用者必須有 GitHub 帳號才能留言。