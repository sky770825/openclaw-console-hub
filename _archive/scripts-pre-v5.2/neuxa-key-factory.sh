#!/bin/bash
# NEUXA Key Factory v1.0
# 產生 100 組隨機密鑰並存入 vault/
mkdir -p ~/.openclaw/vault/keys
for i in {1..100}; do
  KEY="NEUXA-$(openssl rand -hex 4 | tr '[:lower:]' '[:upper:]')"
  echo "$KEY" >> ~/.openclaw/vault/keys/early_bird_keys.txt
done
echo "✅ 已成功產出 100 組早鳥密鑰，存放於 ~/.openclaw/vault/keys/early_bird_keys.txt"
