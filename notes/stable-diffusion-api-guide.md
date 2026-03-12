# Stable Diffusion API 使用指南 (Text-to-Image)

## 來源
根據 Stability AI 官方 API 文件 (stablediffusionapi.com/docs/) 摘要及 AI 推斷。

## 核心資訊

### 1. API 端點 (Endpoint)
- *基於推斷*：https://stablediffusionapi.com/v3/text-to-image
  - (注意：實際端點可能在文件內頁有更精確的定義，此為 RESTful 命名慣例推斷)

### 2. HTTP 方法 (Method)
- POST (用於創建新資源)

### 3. 基礎請求 Body 範例

{
  "key": "YOUR_API_KEY",
  "prompt": "a high-quality photo of an astronaut riding a horse on Mars",
  "negative_prompt": "blurry, low quality, bad anatomy",
  "width": "512",
  "height": "512",
  "samples": "1",
  "num_inference_steps": "20",
  "seed": null,
  "guidance_scale": "7.5",
  "safety_checker": "yes",
  "webhook": null,
  "track_id": null
}
`

### 4. 認證方式
- 將你的 API 金鑰填入 key 欄位中。

## 如何使用 (透過 proxy_fetch)


{
  "action": "proxy_fetch",
  "url": "https://stablediffusionapi.com/v3/text-to-image",
  "method": "POST",
  "body": "{\"key\": \"你的API金鑰\", \"prompt\": \"你想要的圖片描述\", \"negative_prompt\": \"你不想看到的內容\", \"width\": \"512\", \"height\": \"512\"}"
}
`

*重要提醒*：width 和 height` 等參數是常見的 Stable Diffusion 參數，雖未直接在提供的摘要中，但為生成圖片的常用設定。實際使用時可能需要參考完整文件調整。