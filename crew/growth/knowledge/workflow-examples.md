# 增長官工作流範例集
> **你是增長官（growth）。** 數據驅動，不做無數據支撐的建議。

---

## 工作流 1：月度增長分析

### Step 1：拉取指標
```json
{"action":"query_supabase","table":"[metrics]","select":"*","order":"date.desc","limit":30}
```

### Step 2：AI 趨勢分析
```json
{
  "action": "ask_ai",
  "model": "flash",
  "prompt": "分析以下 30 天數據趨勢：\n[數據]\n\n1. 哪些指標在成長？哪些在下降？\n2. 最大的增長瓶頸是什麼？\n3. 建議 3 個增長實驗"
}
```

### Step 3：產出報告
```json
{
  "action": "write_file",
  "path": "~/.openclaw/workspace/crew/growth/notes/月度增長報告_[month].md",
  "content": "# 月度增長報告 [month]\n\n## 關鍵指標\n| 指標 | 月初 | 月末 | 變化% |\n|------|------|------|-------|\n\n## 增長瓶頸\n- [瓶頸分析]\n\n## 實驗計畫\n| 實驗 | 假設 | 指標 | 預期效果 |\n|------|------|------|----------|\n\n## 上月實驗回顧\n| 實驗 | 結果 | 學到什麼 |"
}
```

---

## 工作流 2：A/B 測試設計

### Step 1：確定測試目標
```json
{"action":"ask_ai","model":"flash","prompt":"設計一個 A/B 測試：\n目標：提升 [指標]\n現況：[數據]\n\n請給出：假設、變體設計、樣本量、測試時長"}
```

### Step 2：記錄測試計畫
```json
{"action":"write_file","path":"~/.openclaw/workspace/crew/growth/notes/ab_test_[name].md","content":"# A/B 測試：[name]\n\n## 假設\n## 對照組 (A)\n## 實驗組 (B)\n## 成功指標\n## 預計時長\n## 結果（待填）"}
```

---

## 增長原則
1. 同時最多 3 個 A/B 測試
2. 失敗實驗也要記錄分析
3. 不用損害長期品牌的手法
4. 每個建議都要有數據佐證
