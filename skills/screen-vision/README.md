# Screen Vision Skill

macOS 本地 OCR 與自動化工具，使用 Vision Framework 實現零 Token 成本的螢幕理解。

## 用途

- 螢幕文字擷取（零 Token 成本）
- 精確座標定位螢幕元素
- 多語言文字識別（中英文）
- 應用程式自動化操作基礎

## 安裝

此技能隨 OpenClaw 安裝，但需要設定系統權限。

## 權限設定（重要）

使用此技能前，必須手動開啟以下權限：

1. **系統設定 → 隱私與安全性 → 螢幕錄製**
   - 勾選運行 OpenClaw 的終端機或應用程式（如 Terminal, iTerm2）

2. **系統設定 → 隱私與安全性 → 輔助功能**
   - 同上（用於點擊操作）

## 使用範例

### OCR 識別

```bash
# 識別螢幕特定區域
python3 skills/screen-vision/scripts/vision_ocr.swift \
  --region "100,100,500,300"

# 識別全螢幕
python3 skills/screen-vision/scripts/vision_ocr.swift
```

### 點擊操作

```bash
# 在指定座標點擊
python3 skills/screen-vision/scripts/click.swift \
  --x 500 --y 300

# 右鍵點擊
python3 skills/screen-vision/scripts/click.swift \
  --x 500 --y 300 --button right
```

### 結合使用

```bash
# 1. OCR 識別找到按鈕位置
# 2. 在該位置點擊
python3 skills/screen-vision/scripts/vision_ocr.swift --find "確認按鈕"
python3 skills/screen-vision/scripts/click.swift --x 520 --y 400
```

## 輸出格式

```json
{
  "text": "識別的文字內容",
  "confidence": 0.95,
  "bounds": {
    "x": 100,
    "y": 200,
    "width": 300,
    "height": 50
  }
}
```

## 使用場景

- 自動化操作無 API 的應用程式
- 監控螢幕狀態變化（餘額、通知、進度條）
- 識別非標準 UI（Telegram 桌面版、專業工具軟體）

## 系統需求

- macOS 10.15+
- Swift 執行環境
- 螢幕錄製權限
- 輔助功能權限（用於點擊）

## 注意事項

- 僅支援 macOS
- 首次使用需手動授權
- OCR 準確度取決於螢幕解析度和字體

## 相關連結

- [SKILL.md](SKILL.md) - 完整技能文件
- [Apple Vision Framework](https://developer.apple.com/documentation/vision)
