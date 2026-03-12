#!/usr/bin/env python3
import json
import sys

def simulate_busy_logic(cpu_usage):
    """
    Simulates the logic that converts CPU usage to Live2D motion triggers.
    """
    state = "IDLE"
    motion = "idle_01"
    expression = "default"
    
    if cpu_usage > 80:
        state = "CRITICAL_BUSY"
        motion = "overload_emergency"
        expression = "stress_level_3"
    elif cpu_usage > 40:
        state = "WORKING"
        motion = "typing_fast"
        expression = "focus"
    
    return {
        "input_load": cpu_usage,
        "target_state": state,
        "api_call": f"model.motionManager.startMotion('{motion}')",
        "expression_call": f"model.expressionManager.setExpression('{expression}')"
    }

if __name__ == "__main__":
    load = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0
    result = simulate_busy_logic(load)
    print(json.dumps(result, indent=2))
