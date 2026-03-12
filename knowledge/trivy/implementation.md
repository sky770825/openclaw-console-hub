# Trivy 實戰指引與 CI/CD 整合

Trivy 是 OpenClaw 安全防線的第一道門口。所有代碼在進入 `git push` 前，應通過 Trivy 掃描。

## 🚀 核心命令速查

| 掃描對象 | 命令 | 說明 |
|----------|------|------|
| **源碼 (FS)** | `trivy fs .` | 掃描當前目錄依賴與配置 |
| **映像檔 (Image)** | `trivy image [IMAGE_NAME]` | 掃描 Docker Image 漏洞 |
| **K8s 集群** | `trivy k8s cluster` | 掃描集群資源配置錯誤 |
| **IaC 配置** | `trivy config .` | 掃描 Terraform/Dockerfile 安全性 |

---

## 🛡️ CI/CD 整合實作

在 GitHub Actions 中整合 Trivy 的標準寫法：

```yaml
- name: Run Trivy vulnerability scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'my-app:${{ github.sha }}'
    format: 'table'
    exit-code: '1' # 發現漏洞則阻斷 Pipeline
    ignore-unfixed: true
    severity: 'CRITICAL,HIGH'
```

---

## 🤖 與 LLM (Claude/Qwen) 的聯動

當 Trivy 發現漏洞時，可將 CVE 編號丟給 LLM 尋求修復方案：

**Prompt 範例：**
> 「Trivy 在我的 `package.json` 中發現了 `CVE-2024-XXXX`。這是一個關於 `lodash` 的原型污染漏洞。請幫我生成修復指令，並確認升級後是否會破壞當前的 `v4.x` 兼容性。」

---

## 📈 最佳實踐

1. **建立忽略清單**：使用 `.trivyignore` 忽略已知但暫時無法修復或風險受控的 CVE。
2. **SBOM 生成**：定期產出 `cyclonedx` 格式的 SBOM，供法規審計使用。
   ```bash
   trivy fs --format cyclonedx --output sbom.json .
   ```
3. **定期掃描 DB 更新**：Trivy 依賴本地漏洞庫，運行前確保 `trivy image --download-db-only` 獲取最新資料。
