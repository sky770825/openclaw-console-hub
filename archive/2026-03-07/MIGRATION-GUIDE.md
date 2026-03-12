# 🚀 M3 Max 遷移指南

> 適用機型：Mac Studio M3 Max (96GB RAM)
> 目標：將舊機的 OpenClaw 完整遷移並啟動 MLX 本地模型

## 步驟 1：在舊機 (這裡)
1. 執行 pack-for-m3.sh (小蔡已幫你執行)
2. 將桌面上的 openclaw-m3-migration_xxxx.tar.gz 複製到隨身碟
3. 將 unpack-on-m3.sh 也複製到隨身碟

## 步驟 2：在 M3 新機
1. 將 tar.gz 檔和 unpack-on-m3.sh 放回 *新機桌面*
2. 打開終端機 (Terminal)，執行：
   ``bash
   chmod +x /Users/caijunchang/Desktop/unpack-on-m3.sh
   /Users/caijunchang/Desktop/unpack-on-m3.sh /Users/caijunchang/Desktop/openclaw-m3-migration_xxxx.tar.gz
   `

## 步驟 3：環境初始化 (M3 專屬)
1. *安裝基礎工具* (如果還沒裝)：
   `bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   brew install node git python3
   `

2. *安裝 MLX 與 AI 依賴*：
   `bash
   pip3 install mlx mlx-lm
   `

3. *恢復專案依賴*：
   `bash
   cd /Users/caijunchang/.openclaw/workspace
   npm install
   `

## 步驟 4：啟動 Llama 3 (MLX)
我們要在 96GB 記憶體上跑 Llama-3-70B-Q4 (約佔 40GB)：
`bash
# 下載並執行 (MLX 會自動處理)
python3 -m mlx_lm.generate --model mlx-community/Meta-Llama-3.1-70B-Instruct-4bit --prompt "Hello"
`

## 步驟 5：喚醒小蔡
`bash
cd /Users/caijunchang/.openclaw/workspace
npm run start
``
