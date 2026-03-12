# NEUXA 星群 訂閱服務與額度數據源盤點報告

## 1. 核心 AI 服務
| 服務名稱 | 用途 | 用量查詢方式 | 額度數據源 (API/Dashboard) |
| :--- | :--- | :--- | :--- |
| **OpenAI** | LLM API (GPT-4o, etc.) | Usage API / Dashboard | `https://api.openai.com/v1/usage` |
| **Anthropic** | LLM API (Claude 3.5) | Console / Usage API | `https://api.anthropic.com/v1/stats/usage` (Beta) |
| **DeepSeek** | LLM API | Console | `https://api.deepseek.com/user/balance` |
| **Google Cloud / Vertex** | AI & Cloud Infra | Cloud Billing API | GCP Billing Export to BigQuery |

## 2. 雲端基礎設施與開發工具
| 服務名稱 | 用途 | 用量查詢方式 | 額度數據源 (API/Dashboard) |
| :--- | :--- | :--- | :--- |
| **Vercel** | 前端部署與 Hosting | Vercel API | `https://api.vercel.com/v1/usage` |
| **MongoDB Atlas** | 資料庫 | Atlas Admin API | `https://cloud.mongodb.com/api/atlas/v1.0` |
| **GitHub** | 版本控制與 Actions | GitHub API | `https://api.github.com/orgs/{org}/settings/billing/actions` |
| **AWS** | 雲端計算與儲存 | AWS Billing API | `aws ce get-cost-and-usage` |

## 3. 專案內偵測到的疑似服務組件
### 偵測到之原始碼相關檔案 (線索):
```
/Users/caijunchang/openclaw任務面版設計/.claude/settings.json
/Users/caijunchang/openclaw任務面版設計/.claude/settings.local.json
/Users/caijunchang/openclaw任務面版設計/.env
/Users/caijunchang/openclaw任務面版設計/.env.example
/Users/caijunchang/openclaw任務面版設計/.github/workflows/deploy-gh-pages.yml
/Users/caijunchang/openclaw任務面版設計/.openclaw-patrol-status.json
/Users/caijunchang/openclaw任務面版設計/armory/data-inspector/SKILL.md
/Users/caijunchang/openclaw任務面版設計/armory/proxy-web-fetch/SKILL.md
/Users/caijunchang/openclaw任務面版設計/armory/security-scanner/SKILL.md
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/index.diff
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/status.txt
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/untracked.txt
/Users/caijunchang/openclaw任務面版設計/backups/20260213-172205/working-tree.diff
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172939/index.diff
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172939/status.txt
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172939/untracked.txt
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172939/working-tree.diff
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172954/index.diff
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172954/status.txt
/Users/caijunchang/openclaw任務面版設計/backups/auto/20260213-172954/untracked.txt
```
