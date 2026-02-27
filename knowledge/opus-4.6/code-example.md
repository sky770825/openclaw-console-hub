# Agentic 範例：Podman遷移

**Prompt範例**：
```
Plan rootless Docker→Podman migration for 50-service fleet on AlmaLinux 9.
Include quadlets, firewalld rules, Trivy scan.
Output: full migration script + tests.
```

**Opus 4.6 輸出** (預期)：
- 規劃階段：分析docker-compose → systemd quadlets
- 安全：內聯Trivy + Cosign
- 測試：Podman play kube

**完整腳本**：見 attachment/podman-migration.sh
