import random
import time
import json
import os

class PeaceMonitor:
    def __init__(self):
        self.tension_level = 50  # 0 to 100
        self.peace_indicators = ["外交對話", "經濟依賴", "核監管透明度", "AI 衝突預警"]

    def update_tension(self):
        # 模擬外界影響
        change = random.randint(-10, 10)
        self.tension_level = max(0, min(100, self.tension_level + change))
        return self.tension_level

    def suggest_actions(self):
        if self.tension_level > 80:
            return "警告：偵測到極高核威脅！啟動自動外交干預與全球監控透明化。"
        elif self.tension_level > 50:
            return "注意：緊張局勢上升。建議啟動第三方 AI 協調機制。"
        else:
            return "狀態：和平穩定。繼續維持跨國科技合作。"

    def run(self):
        print("--- 全球和平監測模擬系統 (OpenClaw 版) ---")
        for i in range(5):
            level = self.update_tension()
            suggestion = self.suggest_actions()
            print(f"當前全球緊張指數: {level}/100 | 建議動作: {suggestion}")
            time.sleep(1)

if __name__ == "__main__":
    monitor = PeaceMonitor()
    monitor.run()
