# Council of the Wise Skill

智慧議會 - 從多個專家視角分析想法，提供多面向反饋。

## 用途

- 壓力測試商業計畫
- 評估專案設計
- 內容策略審查
- 重大決策分析

## 安裝

此技能隨 OpenClaw 安裝，無需額外安裝。

## 使用範例

### 發送想法給議會

```
"Send this to the council: 我的新產品想法..."
"Council of the wise: 這個架構設計"
"Get the council's feedback on 商業計畫"
```

### 議會成員

預設成員（位於 `agents/` 資料夾）：

| 成員 | 角色 |
|------|------|
| 👹 Devil's Advocate | 挑戰假設、找出弱點、壓力測試 |
| 🏗️ Architect | 系統設計、結構、高層方法 |
| 🛠️ Engineer | 實作細節、技術可行性 |
| 🎨 Artist | 語調、風格、呈現、使用者體驗 |
| 📊 Quant | 風險分析、ROI、期望值 |

### 新增自訂成員

```bash
# 添加安全審查員
echo "# Pentester
You analyze security implications..." > agents/Pentester.md

# 添加 QA 視角
echo "# QATester
You find edge cases..." > agents/QATester.md
```

## 輸出格式

```markdown
## 🏛️ Council of the Wise — [主題]

### ⚖️ Synthesis (TL;DR)
綜合建議 + 關鍵決策點
成員意見分歧處（這是最有價值的洞察）

---

### 👹 Devil's Advocate
挑戰和風險 — 尖銳、探索的聲音

### 🏗️ Architect
結構和設計 — 策略性、原則性的聲音

### 🛠️ Engineer
實作注意事項 — 實用、直接的聲音

### 🎨 Artist
語調和呈現 — 生動、使用者導向的聲音

### 📊 Quant
風險分析、ROI — 數據驅動的聲音
```

## 流程

1. 接收使用者的想法/主題
2. 發送載入訊息：`🏛️ *The Council convenes...* (this takes 2-5 minutes)`
3. 產生子 Agent（5 分鐘超時）
4. 整合所有視角的反饋
5. 返回綜合報告

## 使用建議

- 適用於：商業想法、內容計畫、專案設計、重大決策
- 不適用於：快速問題、簡單任務、時間敏感請求
- 預期耗時：2-5 分鐘

## 系統需求

- OpenClaw Gateway
- 支援 spawn 子 Agent

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
- [PAI (Personal AI Infrastructure)](https://github.com/danielmiessler/pai)
