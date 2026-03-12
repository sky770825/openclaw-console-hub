#!/bin/bash
# NEUXA 創世會員代號生成器 v1.0
PREFIXES=("Star" "Nova" "Nebula" "Comet" "Pulsar" "Quasar" "Void" "Abyss" "Zenith" "Nadir")
SUFFIXES=("01" "02" "03" "04" "05" "06" "07" "08" "09" "10" "77" "88" "99" "X" "Prime")
MACHINE_ID=$(system_profiler SPHardwareDataType 2>/dev/null | awk '/Hardware UUID/{print $3}' || echo "$(date +%s)")
HASH=$(echo -n "$MACHINE_ID" | shasum -a 256 | cut -c1-8)
PREFIX_IDX=$((16#${HASH:0:2} % 10))
SUFFIX_IDX=$((16#${HASH:2:2} % 15))
CODENAME="${PREFIXES[$PREFIX_IDX]}-${SUFFIXES[$SUFFIX_IDX]}"
echo "╔════════════════════════════════════╗"
echo "║   NEUXA 星雲隱匿區 - 身份認證      ║"
echo "╠════════════════════════════════════╣"
echo "║  代號: $CODENAME                    ║"
echo "║  授權: NEUXA-STARSHIP-2026          ║"
echo "║  狀態: 🟢 已驗證                    ║"
echo "╚════════════════════════════════════╝"
echo "你的 Machine-ID Hash: $HASH"
