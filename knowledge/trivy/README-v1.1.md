# Trivy 核心能力分析 (v1.3 更新版 2025-12)

> Aqua Security | Trivy | Open-Source Vulnerability Scanner王

## 📖 Overview
Trivy is a fast, comprehensive vuln scanner for containers, K8s, code, cloud, IaC, secrets, filesystems. Supports SBOM gen, distroless. Integrates with CI/CD, AI for auto-fix.

**📢 2025年底最新版本**: **v0.68.0** (2025年12月2日發布) + **v0.67.0** 重要更新

---

## 🆕 2025年底重大更新 (v0.67+ / v0.68)

### Seal Security 合作 (v0.67.0)

Trivy 於 **v0.67.0** 開始與 **Seal Security** 深度合作：

| 功能 | 說明 | 效益 |
|------|------|------|
| **Sealed Components 識別** | 完整識別 Seal Security 構建的開源元件 | 乾淨掃描結果 |
| **零誤報** | 標記已修復/密封的漏洞 | 減少誤報困擾 |
| **合規覆蓋** | 完整的合規性報告 | 滿足審計要求 |

Source: [Seal Security Blog](https://www.seal.security/blog/seal-security-aqua-trivy-industry-leading-vulnerability-scanning-meets-production-ready-patching)

### v0.68.0 更新亮點 (2025年12月)
- 持續的漏洞資料庫更新
- 性能優化
- 新的掃描器支援

### 版本速查
| 版本 | 發布日期 | 重點更新 |
|------|----------|----------|
| v0.68.0 | 2025-12-02 | 最新穩定版 |
| v0.67.0 | 2025-10 | Seal Security 整合 |
| v0.66.x | 2025年中 | 多項掃描器增強 |

---

## 🎯 核心強項 (Strengths)
1. **Broad Coverage**
   - OS pkgs, app libs, secrets, misconfigs
   - Containers/K8s/cloud (AWS/Azure/GCP)

2. **Speed & Accuracy**
   - Fastest open-source scanner
   - Distroless/multi-arch support

3. **Ecosystem**
   - SBOM (CycloneDX/SPDX)
   - GitHub Action, Trivy Operator K8s

4. **Free/Open**
   - vs Commercial: Broader, no cost

## 📊 Benchmarks
| Aspect | Trivy | Snyk | Grype |
|--------|-------|------|-------|
| Speed | Fastest | Medium | Slower |
| Coverage | Broad | App-sec deep | Good |
| Cost | Free | Paid | Free |
| Accuracy | 95%+ | 90%+ | 85%+ |

Sources: aquasecurity/trivy GitHub (2026)

## 🛠️ 掃描目標支援
| 目標類型 | 說明 | 範例 |
|----------|------|------|
| Container Image | Docker/OCI 映像檔 | ubuntu, alpine |
| Filesystem | 本地檔案系統 | /workspace |
| Git Repository | 遠端程式碼 | GitHub URL |
| Kubernetes | K8s cluster | pods, deployments |
| AWS/GCP/Azure | 雲端資源 | S3, EC2 |
| Config/IaC | 設定檔 | Terraform, K8s YAML |

## 🎮 使用模式

### 1. 本地掃描
```bash
# 掃描檔案系統
trivy fs /workspace

# 掃描容器
trivy image nginx:latest

# 掃描 Git repo
trivy repo https://github.com/user/repo
```

### 2. CI/CD 整合
```yaml
# GitHub Actions
- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    format: 'sarif'
    exit-code: '1'
```

### 3. Kubernetes 監控
```bash
# 安裝 Trivy Operator
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/trivy-operator/main/deploy/static/trivy-operator.yaml

# 查看報告
kubectl get vulnerabilityreports -A
```

## ⚔️ 比較表 (Comparisons)
| Feature | Trivy | Grok 4.1 | GPT-5.2 | Gemini | Auto-GPT | Einstein | Sonnet |
|---------|-------|----------|---------|--------|----------|----------|--------|
| Scanning | ⭐⭐⭐⭐⭐ | N/A | Code vuln | Image | N/A | Config | Code |
| Speed | ⭐⭐⭐⭐⭐ | Fast | N/A | N/A | Async | N/A | N/A |
| Coverage | ⭐⭐⭐⭐⭐ | N/A | ⭐⭐⭐ | ⭐⭐ | N/A | ⭐⭐ | ⭐⭐⭐ |
| Coding | N/A | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | N/A | Auto | Low | ⭐⭐⭐⭐⭐ |
| Cost | Free | Low | High | Low | Free | Sub | Med |

**Summary**: Essential sec tool; complements AI code gen.

## 🎯 適用場景矩陣
| 場景 | Trivy | 替代方案 | 建議 |
|------|-------|----------|------|
| CI/CD 掃描 | ⭐⭐⭐⭐⭐ | Snyk | Trivy 免費 |
| K8s 監控 | ⭐⭐⭐⭐⭐ | Falco | 搭配使用 |
| 容器安全 | ⭐⭐⭐⭐⭐ | Clair | Trivy 更快 |
| 程式碼掃描 | ⭐⭐⭐⭐ | CodeQL | 視語言選擇 |
| 雲端設定 | ⭐⭐⭐⭐ | Prowler | 多雲支援 |

## 💰 成本分析
| 方案 | 成本 | 適合 |
|------|------|------|
| Trivy OSS | $0 | 所有人 |
| Trivy Enterprise | $500/mo | 大型組織 |
| Snyk | $52/mo/dev | 需商業支援 |
| Grype | $0 | 簡易掃描 |

**優勢**: 功能最完整卻完全免費！

## 🔌 OpenClaw 整合 (Integration)
- **CLI**: `exec trivy fs .` / `trivy image`
- **AGENTS.md**: Green light for sec scans pre-push
- **Tools Synergy**:
  - Pre `git push`: Scan workspace
  - Chain with Sonnet/GPT for fix suggestions
  - `process` continuous monitoring
- **Usage Example**:
  ```javascript
  // OpenClaw 安全檢查
  const scan = await exec({
    command: "trivy fs /workspace --exit-code 1 --format json"
  });
  
  if (scan.vulnerabilities.length > 0) {
    const fix = await sessions_spawn({
      task: `修復這些漏洞: ${scan.vulnerabilities}`,
      model: "claude-sonnet-4.5"
    });
  }
  ```
- **Pro Tip**: Script in boot: Scan + LLM fix loop

## ⚠️ 限制與注意事項
| 限制 | 說明 | 解決方案 |
|------|------|----------|
| 誤報 | 可能有 false positive | 人工審查 |
| 深度 | 原始碼分析不如 CodeQL | 搭配使用 |
| 效能 | 大量映像檔耗時 | 排程掃描 |
| 設定 | 需正確配置 | 參考文件 |

## 📚 學習資源
| 資源 | 連結 |
|------|------|
| GitHub | https://github.com/aquasecurity/trivy |
| 官方文件 | https://aquasecurity.github.io/trivy |
| Aqua Security | https://aquasec.com |

## 🔧 進階整合範例
```bash
#!/bin/bash
# OpenClaw 安全閘道

echo "🔍 掃描安全性..."
trivy fs /workspace --exit-code 1 --no-progress

if [ $? -eq 0 ]; then
  echo "✅ 無漏洞，允許提交"
else
  echo "❌ 發現漏洞，阻擋提交"
  exit 1
fi
```

## 📂 Additional Content
- [strengths.md](./strengths.md) - Detailed strengths
- [comparisons.md](./comparisons.md) - Full benchmarks
- [integration.md](./integration.md) - CI/CD snippets
- [PROMPTS.md](./PROMPTS.md) - Security prompts

## 🏆 安全最佳實踐
| 實踐 | 說明 | 頻率 |
|------|------|------|
| 提交前掃描 | Pre-commit hook | 每次 |
| 映像檔掃描 | CI pipeline | 每次建置 |
| K8s 持續監控 | Trivy Operator | 24/7 |
| 定期全面掃描 | 整體評估 | 每月 |
| 漏洞追蹤 | 建立修復計畫 | 持續 |

**更新**: v1.3 新增 v0.67/v0.68 更新資訊、Seal Security 合作、零誤報功能、版本速查表。2025-12 by 小蔡。

**版本歷史**:
- v1.2: 新增掃描目標、使用模式、場景矩陣、成本分析、最佳實踐表格（2026-02-16）
- v1.1: 初始完整版（2026-02-16）
