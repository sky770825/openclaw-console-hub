# 診斷報告：run_script 白名單邏輯誤傷修復

## 診斷結果
在 `action-handlers.ts` 中，`commandWhitelist` 的正則表達式過於嚴苛，未考慮到 `curl` 指令可能帶有的參數（如 `-s`）或埠號變動（如 `3011`）。

## 偵測到的原始邏輯片段
```typescript

```

## 修正建議
建議將原本的 curl 匹配正則改為更具彈性的格式。

### 推薦的正則表達式
```typescript
/^curl (-s )?http:\/\/localhost:\d+\/api\/health$/
```
此正則可同時相容：
- `curl http://localhost:3011/api/health`
- `curl -s http://localhost:3011/api/health`
- `curl -s http://localhost:3000/api/health`

## 實作方案
由於 `server/src/` 目錄受限無法直接修改，請開發者將 `action-handlers.ts` 中的對應行替換。
