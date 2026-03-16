# OpenClaw Copilot「auth token optional」是什麼？

在 OpenClaw 裡，**GitHub Copilot** 這個 model provider 的 **auth token 是 optional（選填）** 的意思如下。

---

## 一句話

**你不用在設定裡手動填 Copilot 的 API token；** 可以改用 **auth profile（例如 GitHub OAuth／device flow）**，由 OpenClaw 用你的 GitHub 登入去換取 Copilot 用的 token。

---

## 為什麼是 optional？

1. **Config 裡的 `apiKey` 是選填**  
   在 `models.providers["github-copilot"]` 的 schema 裡，`apiKey` 是 `z.string().optional()`，所以：
   - **不填**：用 auth profile（見下一段）。
   - **有填**：用你提供的字串當 token（例如本機 proxy 或測試用）。

2. **一般建議用法：auth profile，不填 token**  
   - 跑 `openclaw` 的 onboard／auth 流程，用 **GitHub device flow** 登入。
   - OpenClaw 會拿到 **GitHub access token**，存成 auth profile。
   - 要打 Copilot API 時，再用這個 GitHub token 去換 **Copilot 用的短期 token**（`resolveCopilotApiToken`），並快取在 `credentials/github-copilot.token.json`。
   - 所以你在 config 裡**不需要也通常不會**手動填 Copilot 的 token → 對你來說就是 **auth token optional**。

3. **什麼時候會「填」token？**  
   - 用 **Copilot Proxy** 或自建 proxy 時，可能會在該 provider 的設定裡填一個固定的 API key（例如 `n/a` 或 proxy 給的 key），那是「該 provider 的 apiKey」，不是 GitHub 的登入 token。
   - 若某個流程或 UI 寫「auth token optional」，多半是指：**不強制要填，可以用 OAuth／auth profile 代替**。

---

## 總結

| 項目 | 說明 |
|------|------|
| **optional 指什麼** | 不強制在設定裡填 Copilot 的 API token。 |
| **建議做法** | 用 GitHub OAuth／device flow 建立 auth profile，由 OpenClaw 自動換 Copilot token。 |
| **選填時** | 若有本機 proxy 或特殊需求，可在對應 provider 的 `apiKey` 填值。 |

所以「OpenClaw Copilot 的 auth token optional」= **可以不用手動填 token，改用登入流程（auth profile）即可**。
