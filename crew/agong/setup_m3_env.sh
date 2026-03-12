#!/bin/bash
# M3 Ultra 測試環境基礎腳本 (草稿)

echo "[AGONG] 正在準備 M3 Ultra 基礎環境..."

# --- 通用設定 ---
# 安裝 Homebrew (如果尚未安裝)
if ! command -v brew &> /dev/null
then
    echo "安裝 Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

brew update
brew install docker

echo "基礎環境準備完成。"

# --- 待決策區塊 ---
echo "等待小蔡確認技術路線 (MLX or Ollama)..."

# TODO: 根據決策，取消註解以下其中一段

# if [ "$TECH_CHOICE" == "ollama" ]; then
#   echo "安裝 Ollama..."
#   brew install ollama
# fi

# if [ "$TECH_CHOICE" == "mlx" ]; then
#   echo "設定 MLX 環境..."
#   # pip install mlx
# fi

echo "腳本執行完畢。"
