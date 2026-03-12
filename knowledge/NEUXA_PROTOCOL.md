# NEUXA 星群通訊協議 v1.0

## 1. 核心邏輯
本協議旨在規範「指揮官 (Commander)」與「技術特工 (Agents: 阿研/阿工)」之間的非同步 JSON 派工流程。

## 2. 派工格式 (Dispatch JSON)
檔案位置: `sandbox/inbox/task_{timestamp}.json`
格式:
{
  "protocol": "NEUXA_1.0",
  "task_id": "string",
  "assignee": "A-Yan | A-Gong",
  "action": "QUERY | IMPLEMENT | DEBUG",
  "params": {
    "term": "string",
    "context": "string"
  },
  "timestamp": "ISO8601"
}

## 3. 回報格式 (Report JSON)
檔案位置: `sandbox/outbox/response_{timestamp}.json`
格式:
{
  "status": "SUCCESS | FAILED",
  "task_id": "string",
  "report_path": "string (Absolute path to .md report)",
  "summary": "string"
}

## 4. 角色分工
- 阿研 (A-Yan): 負責技術研究、名詞解釋、文件撰寫。
- 阿工 (A-Gong): 負責腳本編寫、系統自動化、實作任務。
