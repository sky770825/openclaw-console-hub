import json
import sys

def get_character_reaction(event_type, status):
    reactions = {
        "TASK_COMPLETED": {
            "motion": "Celebrate",
            "expression": "Happy",
            "voice": "太棒了！任務完成了！"
        },
        "TASK_OVERDUE": {
            "motion": "Worry",
            "expression": "Sad",
            "voice": "哎呀，這件事好像超時了..."
        },
        "IDLE": {
            "motion": "Breathe",
            "expression": "Neutral",
            "voice": "我在這裡陪著你。"
        }
    }
    
    key = f"{event_type}_{status}".upper()
    if event_type == "TASK" and status == "COMPLETED":
        return reactions["TASK_COMPLETED"]
    elif event_type == "TASK" and status == "OVERDUE":
        return reactions["TASK_OVERDUE"]
    else:
        return reactions["IDLE"]

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps(get_character_reaction("IDLE", "NONE"), ensure_ascii=False))
    else:
        event = sys.argv[1]
        stat = sys.argv[2]
        print(json.dumps(get_character_reaction(event, stat), ensure_ascii=False))
