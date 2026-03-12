# AI 商業審計 Stage 2 參考資料

> 資料彙整日期：2026-02-15  
> 用途：AI 商業審計 Stage 2 評估框架參考

---

## 1. AI 商業審計的最佳實踐與方法論

### 1.1 核心審計框架

| 框架要素 | 說明 |
|---------|------|
| **治理結構** | 定義審計團隊、內部審計師、資料科學家和業務利害關係人的角色 |
| **結構化評估** | 評估 AI 模型、資料收集實務和資訊安全協定 |
| **場景分析** | 評估 AI 系統的影響並將洞察納入審計計畫 |
| **早期參與** | 與 AI 團隊早期接觸，了解目標、設計和風險 |

### 1.2 主要方法論

**EY 負責任 AI 原則**
- 強調**可靠性、安全性、透明度**
- 以人為本的治理框架
- 將批判性思維和專業懷疑精神融入審計 DNA

**審計流程五步法**
1. 建立治理結構
2. 識別 AI 系統應用的業務流程
3. 評估 AI 治理、道德風險和挑戰
4. 聚焦風險識別和控制框架
5. 確保法規遵循（如 EU AI Act）

### 1.3 關鍵參考資源

- [IBM - What Is an AI Audit?](https://www.ibm.com/think/topics/ai-audit)
- [EY - How internal audit can adapt to AI](https://www.ey.com/en_us/insights/ai/how-internal-audit-can-adapt-to-ai)
- [IIA - Internal Audit of AI Applied To Business Processes](https://www.theiia.org/en/content/articles/affiliate-content/internal-audit-of-artificial-intelligence-applied-to-business-processes/)

---

## 2. 代碼質量評估的關鍵指標

### 2.1 CISQ 軟體品質模型

根據 Consortium for Information and Software Quality (CISQ) 的模型，軟體品質包含以下維度：

| 維度 | 定義 | 衡量方式 |
|-----|------|---------|
| **可靠性 (Reliability)** | 系統在指定條件下維持性能等級的能力 | 故障率、平均修復時間 (MTTR) |
| **性能效率 (Performance)** | 資源使用與性能表現的比率 | 回應時間、吞吐量、資源利用率 |
| **安全性 (Security)** | 保護資訊和資料的能力 | 漏洞數量、安全測試覆蓋率 |
| **可維護性 (Maintainability)** | 程式碼可被理解、修正、調整和增強的容易程度 | 圈複雜度、技術債指標 |
| **程式碼品質 (Code Quality)** | 可讀性、模組化、簡潔性 | 程式碼異味、靜態分析分數 |

### 2.2 八大關鍵軟體品質指標

1. **程式碼品質** - 可維護性、可讀性、效率
2. **測試覆蓋率** - 單元測試、整合測試覆蓋比例
3. **缺陷密度** - 每千行程式碼的缺陷數
4. **變更失敗率** - 導致生產環境故障的部署比例
5. **平均恢復時間 (MTTR)** - 從故障中恢復的平均時間
6. **部署頻率** - 發布到生產環境的頻率
7. **前置時間** - 從程式碼提交到部署的時間
8. **技術債比例** - 需要重構的程式碼比例

### 2.3 產品指標類別

| 類別 | 評估因素 |
|-----|---------|
| **產品指標** | 最終產品的可靠性、安全性、易用性 |
| **流程指標** | 開發流程的效率和一致性 |
| **專案指標** | 時程、成本、資源利用率 |

### 2.4 關鍵參考資源

- [The 8 software quality metrics that actually matter - DX](https://getdx.com/blog/software-quality-metrics/)
- [18 Software Quality Metrics - Cortex](https://www.cortex.io/post/software-quality-metrics)
- [How to Measure Key Software Quality Metrics - Waydev](https://waydev.co/software-quality-metrics/)

---

## 3. 市場定位分析的框架與工具

### 3.1 STP 行銷框架

STP（Segmentation, Targeting, Positioning）是三步驟行銷框架：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Segmentation   │ → │   Targeting     │ → │  Positioning    │
│    (市場區隔)    │    │   (目標市場)     │    │    (定位)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
      識別不同客戶群           選擇最有價值的區隔          建立差異化競爭優勢
```

#### 3.1.1 市場區隔 (Segmentation)

| 區隔維度 | 說明 |
|---------|------|
| **人口統計** | 年齡、性別、收入、教育程度 |
| **地理區域** | 國家、城市、氣候區域 |
| **心理特徵** | 生活方式、價值觀、個性 |
| **行為特徵** | 使用頻率、品牌忠誠度、購買時機 |

#### 3.1.2 目標市場選擇 (Targeting)

評估因素：
- 市場規模
- 成長潛力
- 競爭格局
- 組織能力匹配度

#### 3.1.3 定位 (Positioning)

**定位圖 (Positioning Map)**：
- 使用兩個變數繪製市場概覽
- 識別市場機會（空白區隔）
- 對比競爭對手的產品特性

### 3.2 定位分析工具

| 工具 | 用途 |
|-----|------|
| **競爭特性比較表** | 比較產品與競爭對手的功能差異 |
| **SWOT 分析** | 識別優勢、劣勢、機會、威脅 |
| **定位圖** | 視覺化市場區隔和競爭位置 |
| **價值主張圖** | 明確產品對目標客戶的獨特價值 |

### 3.3 關鍵參考資源

- [STP Marketing Model - Smart Insights](https://www.smartinsights.com/digital-marketing-strategy/customer-segmentation-targeting/segmentation-targeting-and-positioning/)
- [STP Framework - Amati and Associates](https://www.amati-associates.com/stp-segmentation-targeting-positioning/)
- [Segmentation, Targeting, and Positioning - Wikipedia](https://en.wikipedia.org/wiki/Segmenting-targeting-positioning)

---

## 4. 風險識別的常見維度

### 4.1 NIST AI 風險管理框架 (AI RMF 1.0)

NIST AI RMF 整合了以下維度以確保全面的 AI 安全：

| 維度 | 說明 |
|-----|------|
| **技術維度** | 模型性能、資料品質、系統可靠性 |
| **營運維度** | 業務流程、供應鏈、營運連續性 |
| **組織維度** | 治理結構、人員能力、文化 |
| **人與地球 (People & Planet)** | 社會影響、環境影響、倫理考量 |
| **法律與合規** | 法規遵循、法律責任 |

### 4.2 AI 風險評估框架步驟

1. **盤點**：建立組織內所有 AI 系統的清單
2. **風險識別**：評估每個系統的威脅可能性和影響
3. **生命週期評估**：從訓練、部署到持續使用的各階段風險
4. **緩解計畫**：在威脅變成安全事件前規劃緩解措施

### 4.3 風險識別清單

| 風險類別 | 具體風險 |
|---------|---------|
| **資料威脅** | 資料外洩、隱私侵犯、資料偏見 |
| **模型性能** | 準確度下降、模型漂移、過度擬合 |
| **使用者互動** | 誤用、濫用、使用者誤解 |
| **安全威脅** | 對抗性攻擊、模型竊取、提示注入 |
| **新興風險** | TEVV（測試、評估、驗證、確認）流程中識別的新風險 |

### 4.4 TEVV 任務

**測試、評估、驗證、確認** (Test, Evaluation, Verification, Validation) 任務可協助：
- 相對於技術、社會、法律和倫理標準提供洞察
- 預測影響和評估追蹤新興風險
- 支援中期修正和事後風險管理

### 4.5 關鍵參考資源

- [NIST AI RMF 1.0](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf)
- [AI Risk Assessment Framework - SentinelOne](https://www.sentinelone.com/cybersecurity-101/data-and-ai/ai-risk-assessment-framework/)
- [AI Risk Management Framework - Palo Alto Networks](https://www.paloaltonetworks.com/cyberpedia/ai-risk-management-framework)
- [NIST AI RMF: Generative AI Profile](https://www.nist.gov/itl/ai-risk-management-framework)

---

## 總結與建議

### Stage 2 評估重點整合

| 評估面向 | 核心問題 | 參考框架 |
|---------|---------|---------|
| **審計方法** | 是否有結構化的 AI 治理和審計流程？ | EY 負責任 AI 原則、IBM 五步法 |
| **代碼品質** | 產品技術債和可維護性如何？ | CISQ 模型、八大關鍵指標 |
| **市場定位** | 產品在目標市場中的競爭位置？ | STP 框架、定位圖 |
| **風險管理** | 是否建立了全面的風險識別機制？ | NIST AI RMF、TEVV 流程 |

### 下一步行動建議

1. **建立評分卡**：根據上述框架為每個評估面向設計評分標準
2. **資料收集**：準備問卷和文件清單給被審計公司
3. **專家訪談**：針對技術、商業、法規面向安排深度訪談
4. **報告模板**：設計標準化的 Stage 2 評估報告格式

---

*文件由 OpenClaw AI Assistant 彙整*
