import json
import sys

def validate_event(event):
    required_keys = ["event_name", "timestamp", "phase"]
    for key in required_keys:
        if key not in event:
            return False, f"Missing key: {key}"
    
    if event["phase"] == 1 and "scroll_depth" not in event:
        return False, "Phase 1 events must include scroll_depth"
    if event["phase"] == 2 and "interaction_id" not in event:
        return False, "Phase 2 events must include interaction_id"
    if event["phase"] == 3 and "conversion_type" not in event:
        return False, "Phase 3 events must include conversion_type"
        
    return True, "Valid"

sample_events = [
    {"event_name": "page_scroll", "timestamp": 1715000000, "phase": 1, "scroll_depth": 50},
    {"event_name": "demo_click", "timestamp": 1715000001, "phase": 2, "interaction_id": "code_editor"},
    {"event_name": "signup_btn", "timestamp": 1715000005, "phase": 3, "conversion_type": "click"}
]

for event in sample_events:
    is_valid, msg = validate_event(event)
    print(f"Event {event['event_name']}: {msg}")

