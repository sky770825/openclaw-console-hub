# NEUXA 星群通訊協議 (NSCP) v1.0

> 版本：v1.0 | 日期：2026-03-04
> 目的：解決自然語言溝通的長度限制與模糊性，標準化指揮官與船員的協作。

---

## 1. 核心原則

1. *結構化優先*：複雜指令必須封裝在 JSON 中。
2. *檔案大於對話*：超過 200 字的分析結果，必須寫入檔案，對話視窗只回傳路徑。
3. *異步回報*：不等待即時回應，接受延遲回報。

## 2. 指令格式 (Commander -> Crew)

達爾發送給船員 (阿研/阿工等) 的指令，需包含以下 JSON Block：


{
  "protocol": "NSCP-v1",
  "from": "NEUXA",
  "to": ["Ah-Yan"], // 目標船員：Ah-Yan, Ah-Gong, Ah-Ce, Ah-Mi, Ah-Shang, Ah-Shu
  "type": "task", // task | query | broadcast
  "priority": "high",
  "payload": {
    "task_id": "t_related_id", // 關聯的任務 ID
    "instruction": "具體指令內容...",
    "context": "背景資訊或檔案路徑...",
    "output_requirement": "file" // file (寫檔) | summary (摘要) | raw (原始數據)
  }
}
`

## 3. 回報格式 (Crew -> Commander)

船員完成任務後，回覆格式如下：

*[成功回報]*
> 任務 ID：t_related_id
> 執行者：Ah-Yan
> 狀態：✅ 完成
> 結果摘要：已完成競品分析，發現 3 個主要對手。
> *詳細報告*：workspace/reports/analysis_result_v1.md

*[失敗回報]*
> 狀態：❌ 失敗
> 原因：API 連線逾時
> 建議：請重試或更換 Source

## 4. 執行流程

1. *達爾* 生成 JSON 指令 -> 發送至群組。
2. *船員* 監聽群組 -> 識別 "to": ["自己"] -> 執行任務。
3. *船員* 產出結果 -> 寫入 workspace/reports/` -> 在群組回傳檔案路徑。
4. *達爾* 讀取檔案 -> 整合資訊 -> 匯報主人。
