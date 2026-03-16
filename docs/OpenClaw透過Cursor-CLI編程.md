# 如何使用 OpenClaw 透過 Cursor CLI 執行 Cursor 並輸入訊息來進行編程

以下依「先裝 Cursor CLI → 終端直接跑 → 讓 OpenClaw 代為執行」的順序說明。

---

## 一、安裝 Cursor CLI 並確認指令可用

### 1. 安裝

在終端執行（依作業系統擇一）：

```bash
# macOS / Linux / WSL
curl https://cursor.com/install -fsS | bash
```

```powershell
# Windows PowerShell
irm 'https://cursor.com/install?win32=true' | iex
```

### 2. 讓 `agent` 指令在 PATH 裡

安裝後指令名稱是 **`agent`**（不是 `cursor`），通常會裝在 `~/.local/bin`。

- **zsh**（macOS 預設）：  
  `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc`  
  然後執行 `source ~/.zshrc` 或開新終端。
- **bash**：  
  `echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc`  
  然後 `source ~/.bashrc`。

### 3. 驗證

```bash
agent --version
```

有版本輸出就代表 Cursor CLI 可用。

---

## 二、用 Cursor CLI 直接「輸入訊息」做編程（終端）

### 互動模式（對話式）

```bash
# 進入專案目錄後執行
cd /path/to/your/project
agent
```

進入後用自然語言描述需求，例如：「重構 auth 模組改用 JWT」「幫我加一個登入頁」。

也可以一開場就帶一句提示：

```bash
agent "refactor the auth module to use JWT tokens"
```

### 無頭／非互動模式（腳本、自動化、給 OpenClaw 呼叫）

不進入對話，直接傳一句提示、把結果印到終端：

```bash
cd /path/to/your/project
agent -p "你的編程指令"
# 或
agent --print "你的編程指令"
```

若要 **允許 Cursor 直接改檔**（不經過你手動批准），加上 `--force`：

```bash
agent -p --force "Refactor this code to use modern ES6+ syntax"
```

輸出格式可選：

- `--output-format text`：純文字（預設）
- `--output-format json`：結構化，方便腳本解析
- `--output-format stream-json`：即時串流進度

**範例**（在專案目錄下）：

```bash
# 只分析、不改檔
agent -p "分析這個專案的依賴並列出建議"

# 改檔（無需手動批准）
agent -p --force "在 src 下新增一個登入頁面元件 Login.tsx"
```

也就是說：**在終端用 `agent` 下指令 = 用 Cursor CLI 執行 Cursor 並輸入訊息來編程**。

---

## 三、讓 OpenClaw「透過 Cursor CLI」執行編程

OpenClaw 本身沒有內建「呼叫 Cursor」的專用工具，但可以用 **exec（執行終端指令）** 來跑 Cursor CLI，等於「OpenClaw 幫你執行 Cursor 並傳入訊息」。

### 前提

1. **Cursor CLI 已安裝且 `agent` 在 PATH 裡**（見上一節）。  
2. **OpenClaw 的 exec 工具可用**：  
   - 若你有開 exec 審核，需在 OpenClaw 裡批准執行。  
   - 若有限制指令白名單，需允許執行 `agent`（或你實際用的 Cursor CLI 指令路徑）。

### 做法一：直接對 OpenClaw 下自然語言指令

你對 OpenClaw（Telegram、Chat、TUI 等）說清楚：**要在哪個目錄、用 Cursor 做什麼**。例如：

- 「在專案 `/Users/me/myapp` 用 Cursor CLI 執行：重構 auth 模組改用 JWT」
- 「用 Cursor 在 `~/project` 執行：`agent -p --force \"加一個登入頁面\"`」

OpenClaw 會用 **exec** 在對應目錄執行你指定的指令（例如 `cd /Users/me/myapp && agent -p --force "..."`）。  
若 exec 被擋或沒權限，需在 OpenClaw 設定／審核裡放行。

### 做法二：寫成固定指令（可重複用）

在專案目錄下先試好指令，再讓 OpenClaw 只負責「執行這行」：

```bash
# 你在終端先試過沒問題的範例
cd /Users/caijunchang/my-project
agent -p --force "添加登入頁面並接上現有 API"
```

之後對 OpenClaw 說：「在 `/Users/caijunchang/my-project` 執行：  
`agent -p --force \"添加登入頁面並接上現有 API\"`」  
OpenClaw 就會用 exec 跑這條。

### 做法三：做成 OpenClaw 技能（進階）

若你常做「用 Cursor 在某某專案執行某某任務」，可以寫一個 **OpenClaw 技能**：  
技能接受參數（例如專案路徑、任務描述），內部組出  
`cd <專案路徑> && agent -p [--force] "<任務描述>"`  
並透過 exec 或 OpenClaw 的 run-command 機制執行。  
這樣你只要對 OpenClaw 說「用 Cursor 在 X 專案做 Y」，就會自動帶入路徑與訊息。

---

## 四、注意事項

1. **工作目錄**  
   `agent` 會以**當前工作目錄**當專案根目錄。用 OpenClaw exec 時，要讓執行的 shell 先 `cd` 到正確專案路徑再跑 `agent`。

2. **無頭模式改檔**  
   `agent -p --force` 會直接寫入檔案，不會再問你。請只在信任的專案／目錄使用，或先用 `agent -p "..."`（不加 `--force`）只看建議。

3. **逾時與長時間任務**  
   若 Cursor CLI 跑很久，OpenClaw 的 exec 可能有逾時；必要時在 OpenClaw 設定拉長 exec timeout，或把大任務拆成多個小指令。

4. **認證**  
   在純腳本／無頭環境（例如由 OpenClaw 在背景執行）時，Cursor 官方文件提到可設 `CURSOR_API_KEY`。若你從未登入過 Cursor，請先在一般終端跑一次 `agent` 完成登入，再給 OpenClaw 用。

5. **PATH**  
   OpenClaw 的 Gateway／agent 若用 launchd 或不同使用者跑，其環境的 PATH 可能沒有 `~/.local/bin`。若 exec 回報找不到 `agent`，可在 exec 的指令裡寫**絕對路徑**，例如：  
   `$HOME/.local/bin/agent -p "..."`  
   或把 Cursor CLI 裝到系統 PATH（例如 `/usr/local/bin`）再讓 OpenClaw 呼叫。

---

## 五、快速對照

| 你想做的事 | 做法 |
|------------|------|
| 自己在終端用 Cursor 編程 | `cd 專案目錄` → `agent` 或 `agent "訊息"` |
| 腳本／一次性的非互動編程 | `agent -p "訊息"` 或 `agent -p --force "訊息"` |
| 讓 OpenClaw 代為執行 Cursor 編程 | 對 OpenClaw 下指令，內容包含「在 X 目錄執行 `agent -p ...`」，由 OpenClaw 用 exec 執行；或做成技能自動組指令 |

**官方文件**：  
- [Cursor CLI Overview](https://cursor.com/docs/cli/overview)  
- [Using Agent in CLI](https://cursor.com/docs/cli/using)（含 `-p` / `--print` 非互動模式）  
- [Using Headless CLI](https://cursor.com/docs/cli/headless)（腳本與 `--force`）  
- [Installation](https://cursor.com/docs/cli/installation)
