#!/bin/bash
# This script generates a JSON configuration for GA4 event tracking
# based on the features defined in the UI components.

OUTPUT_JSON="/Users/caijunchang/.openclaw/workspace/sandbox/output/tracking_config.json"

echo "Creating tracking configuration..."

cat <<JSON > "$OUTPUT_JSON"
{
  "page": "Features",
  "version": "1.0.0",
  "events": [
    {
      "event_name": "feature_card_click",
      "parameters": ["feature_id", "feature_name", "index"]
    },
    {
      "event_name": "scroll_milestone",
      "parameters": ["percentage"]
    },
    {
      "event_name": "cta_click",
      "parameters": ["location", "text"]
    }
  ],
  "selectors": {
    "cards": ".feature-card",
    "cta": ".btn-primary-action"
  }
}
JSON

echo "Tracking configuration generated at $OUTPUT_JSON"
