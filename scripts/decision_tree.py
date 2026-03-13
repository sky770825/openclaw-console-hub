import json
import os
import uuid
import sys
import time
from datetime import datetime

# 配置路徑
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECISION_DIR = os.path.join(BASE_DIR, "memory/decisions")

# 確保目錄存在
os.makedirs(DECISION_DIR, exist_ok=True)

class DecisionTreeManager:
    def __init__(self, session_id=None):
        self.session_id = session_id or os.getenv("OPENCLAW_SESSION_ID", str(uuid.uuid4()))
        self.current_decision_id = None

    def log_decision(self, task, thinking_data, options, selected_option_id, rationale, intervention_required=True):
        """
        記錄一個決策點。
        thinking_data 應包含: understanding, category, sop_ref, environmental_check
        options 應為列表: [{"id": "...", "description": "...", "reason": "...", "risk": "..."}]
        """
        decision_id = str(uuid.uuid4())
        decision_node = {
            "id": decision_id,
            "session_id": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "task": task,
            "thinking": {
                "understanding": thinking_data.get("understanding", ""),
                "category": thinking_data.get("category", "中等"),
                "sop_ref": thinking_data.get("sop_ref", "SOP-15"),
                "environmental_check": thinking_data.get("environmental_check", "🟢 正常"),
                "options": options,
                "selected_option": selected_option_id,
                "rationale": rationale
            },
            "intervention": {
                "required": intervention_required,
                "status": "pending" if intervention_required else "skipped",
                "user_input": None,
                "intervened_at": None
            },
            "history": [] # 用於回溯
        }
        
        self._save_decision(decision_id, decision_node)
        self.current_decision_id = decision_id
        return decision_id

    def _save_decision(self, decision_id, node):
        filepath = os.path.join(DECISION_DIR, f"{decision_id}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(node, f, indent=2, ensure_ascii=False)
        # 同步更新一個「最新決策」索引以便追蹤
        latest_path = os.path.join(DECISION_DIR, "latest.json")
        with open(latest_path, 'w', encoding='utf-8') as f:
            json.dump({"latest_id": decision_id}, f)

    def load_decision(self, decision_id):
        filepath = os.path.join(DECISION_DIR, f"{decision_id}.json")
        if not os.path.exists(filepath):
            return None
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)

    def generate_markdown(self, decision_id):
        node = self.load_decision(decision_id)
        if not node:
            return "❌ 找不到決策記錄。"
            
        think = node['thinking']
        status_emoji = "⏳" if node['intervention']['status'] == "pending" else "✅"
        
        md = f"# 🌳 Agent 實時決策追蹤 {status_emoji}\n\n"
        md += f"**ID**: `{node['id']}`\n"
        md += f"**任務**: {node['task']}\n"
        md += f"**時間**: {node['timestamp']}\n"
        md += f"**分級**: {think['category']} | **SOP**: {think['sop_ref']} | **環境**: {think['environmental_check']}\n\n"
        
        md += "## 🧠 思考過程 (SOP-15)\n"
        md += f"> {think['understanding']}\n\n"
        
        md += "## ⚖️ 方案分析\n"
        md += "| 方案 | 描述 | 理由 | 風險 |\n"
        md += "| :--- | :--- | :--- | :--- |\n"
        for opt in think['options']:
            prefix = "⭐ **[推薦]** " if opt['id'] == think['selected_option'] else ""
            md += f"| {prefix}{opt['id']} | {opt['description']} | {opt['reason']} | {opt['risk']} |\n"
        
        md += f"\n**🎯 選擇方案**: `{think['selected_option']}`\n"
        md += f"**💡 選擇理由**: {think['rationale']}\n\n"
        
        if node['intervention']['status'] == "pending":
            md += "---\n"
            md += "## 🛑 人工介入請求\n"
            md += "請選擇以下操作：\n"
            md += "1. **Approve (y)**: 接受推薦方案並繼續。\n"
            md += "2. **Correct (c <指令>)**: 提供新的指令或修正推理。\n"
            md += "3. **Rollback (r)**: 回溯到上一個決策點（若有）。\n"
            md += "4. **Reject (n)**: 終止任務。\n\n"
            md += f"請在終端機輸入：`python3 scripts/decision_tree.py interact {decision_id}`\n"
        else:
            md += "---\n"
            md += f"## 📝 介入結果\n"
            md += f"**狀態**: {node['intervention']['status']}\n"
            md += f"**使用者輸入**: {node['intervention']['user_input']}\n"
            md += f"**處理時間**: {node['intervention']['intervened_at']}\n"
            
        return md

    def interact(self, decision_id):
        """命令行互動介面"""
        node = self.load_decision(decision_id)
        if not node:
            print(f"Error: Decision {decision_id} not found.")
            return

        print(self.generate_markdown(decision_id))
        
        try:
            choice = input("\n[Decision] 輸入指令 (y/c/r/n): ").strip()
            
            if choice.lower() == 'y':
                return self.apply_intervention(decision_id, "approved", "User approved recommendation.")
            elif choice.lower().startswith('c '):
                correction = choice[2:].strip()
                return self.apply_intervention(decision_id, "corrected", correction)
            elif choice.lower() == 'r':
                return self.apply_intervention(decision_id, "rollback", "User requested rollback.")
            elif choice.lower() == 'n':
                return self.apply_intervention(decision_id, "rejected", "User rejected proposal.")
            else:
                print("無效指令。")
                return None
        except EOFError:
            return None

    def apply_intervention(self, decision_id, status, user_input):
        node = self.load_decision(decision_id)
        if not node: return None
            
        node['intervention']['status'] = status
        node['intervention']['user_input'] = user_input
        node['intervention']['intervened_at'] = datetime.now().isoformat()
        
        self._save_decision(decision_id, node)
        print(f"\n✅ 決策已更新為: {status}")
        return node

    def wait_for_intervention(self, decision_id, timeout=300):
        """自動化輪詢等待介入結果 (用於非互動式場景)"""
        start_time = time.time()
        print(f"Waiting for intervention on {decision_id}...")
        while time.time() - start_time < timeout:
            node = self.load_decision(decision_id)
            if node and node['intervention']['status'] != "pending":
                return node
            time.sleep(2)
        return None

if __name__ == "__main__":
    manager = DecisionTreeManager()
    
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/decision_tree.py [create|show|interact|wait] [args...]")
        sys.exit(1)
        
    cmd = sys.argv[1]
    
    if cmd == "create":
        # 模擬一個符合 SOP-15 的決策
        d_id = manager.log_decision(
            task="測試決策器",
            thinking_data={
                "understanding": "需要驗證新版決策器的互動功能。",
                "category": "中等",
                "sop_ref": "SOP-15",
                "environmental_check": "🟢 正常"
            },
            options=[
                {"id": "Option A", "description": "方案 A", "reason": "簡單", "risk": "無"},
                {"id": "Option B", "description": "方案 B", "reason": "完整", "risk": "耗時"}
            ],
            selected_option_id="Option B",
            rationale="為了確保功能完整性。"
        )
        print(f"DECISION_ID:{d_id}")
        print(manager.generate_markdown(d_id))
        
    elif cmd == "show":
        if len(sys.argv) < 3:
            latest_path = os.path.join(DECISION_DIR, "latest.json")
            if os.path.exists(latest_path):
                with open(latest_path, 'r') as f:
                    d_id = json.load(f)['latest_id']
            else:
                print("No decisions found.")
                sys.exit(1)
        else:
            d_id = sys.argv[2]
        print(manager.generate_markdown(d_id))
        
    elif cmd == "interact":
        if len(sys.argv) < 3:
            print("Usage: python3 scripts/decision_tree.py interact <decision_id>")
            sys.exit(1)
        manager.interact(sys.argv[2])
        
    elif cmd == "wait":
        if len(sys.argv) < 3:
            print("Usage: python3 scripts/decision_tree.py wait <decision_id>")
            sys.exit(1)
        res = manager.wait_for_intervention(sys.argv[2])
        if res:
            print(f"INTERVENTION_STATUS:{res['intervention']['status']}")
            print(f"USER_INPUT:{res['intervention']['user_input']}")
        else:
            print("TIMEOUT")
