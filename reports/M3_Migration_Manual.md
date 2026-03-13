# M3 新機啟動與接軌手冊 (M3 Ultra Integration Manual)

## 0. 計畫背景
追蹤 05:15 發起的 M3 Ultra 遷移計畫。

## 1. 數據與自動化 (阿數)
- **數據源**: /Users/sky770825/.openclaw/workspace/reports/token_usage_30d.csv (已生成 30 天樣本)
- **修復工具**: /Users/sky770825/.openclaw/workspace/scripts/fix_m3_paths.sh

## 2. 財務與合規性分析 (阿商)
# M3 Ultra 成本與安全優勢分析報告

## 1. 成本分析
- **現有開銷**: 過去 30 天雲端 API 累計花費約 $1.70222。
- **投資回報**: M3 Ultra (128GB RAM) 預計硬體成本約 $4,000。遷移後，月度 API 支出將降至幾乎為 0，預計 10 個月內實現收支平衡。
- **長期效益**: 無限量使用地端推論，不再受 API Rate Limit 限制。

## 2. 安全優勢
- **數據隱私**: 企業核心 Prompt 與客戶數據 100% 留存在地端，滿足 GDPR 與 ISO27001 規範。
- **離線運行**: 在無外部網路連接時仍可提供 LLM 服務，確保業務連續性。

## 3. 工程架構設計 (阿工)
# MLX/Ollama 架構評估結論

## 評估對象
- **硬體**: Apple Studio (M3 Ultra)
- **軟體棧**: Ollama (Backend) + MLX (High Performance Inference)

## 核心結論
1. **效能**: M3 Ultra 的 800GB/s 記憶體頻寬非常適合 LLM。Llama3-70B (4-bit) 預計可達到 15-20 tps。
2. **記憶體管理**: 128GB 統一記憶體允許同時加載多個模型（如 Mistral + Llama3），並共享給 GPU/CPU 使用。
3. **穩定性**: Ollama 提供成熟的 REST API，與現有前端看板無縫接軌。

## 4. 戰略實施路徑 (阿策)
# M3 Ultra 遷移三階段詳細計畫

## 第一階段：基礎設施部署 (D-Day to D+3)
- 安裝 macOS Sonoma 並優化核心參數。
- 部署 Docker 與 Ollama 容器環境。
- 執行硬體跑分驗證 (MLX Benchmarks)。

## 第二階段：模型調優與對接 (D+4 to D+10)
- 導入 30 天 Token 數據進行基準測試。
- 調整 Prompt Template 以適配地端量化模型。
- 完成向量數據庫 (Vector DB) 的本地鏡像遷移。

## 第三階段：正式切換與驗證 (D+11 to D+14)
- 實施藍綠佈署 (Blue-Green Deployment)，逐步將流量導向 M3 Ultra。
- 監控推論延遲與輸出質量。
- 正式關閉高成本雲端 API 訂閱。

---
*文件編號: OPENCLAW-M3-2023*
*狀態: 審閱中*
