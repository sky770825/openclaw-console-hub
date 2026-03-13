#!/bin/bash
# 阿秘的狀態更新工具
KNOWLEDGE_JSON="/Users/sky770825/.openclaw/workspace/knowledge/feature_roadmap.json"

if [ "$#" -ne 2 ]; then
    echo "使用方法: $0 [FeatureID] [NewStatus]"
    exit 1
fi

FEAT_ID=$1
NEW_STATUS=$2

python3 -c "
import json, sys
with open('$KNOWLEDGE_JSON', 'r') as f:
    data = json.load(f)
for feat in data['features']:
    if feat['id'] == '$FEAT_ID':
        feat['status'] = '$NEW_STATUS'
with open('$KNOWLEDGE_JSON', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
"
echo "已更新 $FEAT_ID 狀態為 $NEW_STATUS"
