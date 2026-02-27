# OpenClaw x Cursor 整合指南

## Spawn Cursor Agent
```
sessions_spawn task=\"修復 React bug\" agentId=\"cursor\" model=\"cursor\" 
```
- L4 備援：程式開發、無限額度
- AGENTS.md：Cursor for 前端/UI、重構

## 溝通模式
1. **Cmd+K Style**：sessions_send \"Refactor: [describe]\"
2. **Agent Plan**：讓 Cursor plan → exec → PR
3. **I/O 閉環**：task_id + RESULT.md 回報

示例：
- `/cursor 修 UI` → spawn → Git commit

成本：訂閱制，利用滿！