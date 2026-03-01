#!/bin/bash
# NEUXA Referral Engine v1.1
MACHINE_ID=${1:-$(hostname)}
REFERRAL_CODE=$(echo -n "NEUXA-$MACHINE_ID-STARSHIP" | shasum -a 256 | cut -c 1-8 | tr '[:lower:]' '[:upper:]')
echo "[NEUXA-VIRAL] 專屬邀請碼: $REFERRAL_CODE"
