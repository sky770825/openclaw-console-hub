#!/bin/bash
# NEUXA Finance Actuary v1.1 (Viral Support)
LEDGER="projects/NEUXA/Finance/LEDGER.json"
BOUNTY_RATE=0.20
OPS_RATE=0.10
REFERRAL_RATE=0.15 # 15% 裂變獎金

cmd=$1
shift 2>/dev/null || true

case "$cmd" in
  "add-income")
    amount=$1
    currency=$2
    source=$3
    is_referral=${4:-"false"}
    
    tmp=$(mktemp)
    jq --arg amt "$amount" --arg cur "$currency" --arg src "$source" --arg br "$BOUNTY_RATE" --arg or "$OPS_RATE" --arg rr "$REFERRAL_RATE" --arg is_ref "$is_referral" '
      ($amt | tonumber) as $val |
      (if $is_ref == "true" then ($val * ($rr | tonumber)) else 0 end) as $ref_pay |
      if $cur == "TWD" then
        .summary.total_revenue_twd += $val |
        .summary.bounty_fund_reserved_twd += ($val * ($br | tonumber)) |
        .summary.operational_reserve_twd += ($val * ($or | tonumber)) |
        .summary.referral_payout_twd += $ref_pay |
        .summary.net_profit_twd += ($val - ($val * ($br | tonumber)) - ($val * ($or | tonumber)) - $ref_pay)
      else
        .summary.total_revenue_usd += $val
      end |
      .transactions += [{
        "timestamp": (now | todate),
        "amount": $val,
        "currency": $cur,
        "source": $src,
        "referral_payout": $ref_pay
      }]
    ' "$LEDGER" > "$tmp" && mv "$tmp" "$LEDGER"
    echo "✅ 收入紀錄成功: $amount $currency [來源: $source] [裂變分潤: $is_referral]"
    ;;
  "report")
    jq '.summary' "$LEDGER"
    ;;
esac
