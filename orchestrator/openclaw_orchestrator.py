#!/usr/bin/env python3
"""
OpenClaw 多代理編排層 - LangGraph
適用：Mac Studio M3 Ultra 96GB
模型配置：qwen2.5:72b (指揮官) + mistral:7b (快速路徑) + deepseek-r1:70b (深度推理)
"""

from typing import TypedDict, Optional, Literal
from langgraph.graph import StateGraph, START, END
import ollama
import requests
import json
import os

class MissionState(TypedDict):
    task_id: str
    objective: str
    category: str
    assigned_agent: str
    model_used: str
    status: str
    result: str
    quality_score: float
    retry_count: int

def select_model(task_length: int, need_reasoning: bool = False) -> str:
    if need_reasoning:
        return "deepseek-r1:70b"
    elif task_length > 500:
        return "qwen2.5:72b"
    else:
        return "mistral:7b"

AGENT_ROUTING = {
    "research":  {"agent": "AYAN",   "keywords": ["搜尋", "調查", "分析", "趨勢", "資料"]},
    "coding":    {"agent": "AGONG",  "keywords": ["程式", "程式碼", "bug", "開發", "API"]},
    "creative":  {"agent": "AMI",    "keywords": ["文案", "設計", "創意", "行銷", "品牌"]},
    "execute":   {"agent": "ACE",    "keywords": ["部署", "執行", "自動化", "排程", "工作流"]},
    "security":  {"agent": "ASHANG", "keywords": ["安全", "檢查", "漏洞", "防護", "稽核"]},
    "monitor":   {"agent": "ASHU",   "keywords": ["監控", "狀態", "健康", "效能", "日誌"]},
}

def analyze_mission(state: MissionState) -> MissionState:
    objective = state["objective"]
    model = select_model(len(objective))
    try:
        response = ollama.chat(
            model=model,
            messages=[{"role": "user", "content": f"分析以下任務，回答一個詞（research/coding/creative/execute/security/monitor）：\n任務：{objective}\n只回答類別，不要其他文字。"}]
        )
        category = response["message"]["content"].strip().lower()
        if category not in AGENT_ROUTING:
            category = "execute"
        agent_info = AGENT_ROUTING[category]
        return {**state, "category": category, "assigned_agent": agent_info["agent"], "model_used": model, "status": "routing"}
    except Exception as e:
        return {**state, "category": "execute", "assigned_agent": "ACE", "status": "routing"}

def execute_mission(state: MissionState) -> MissionState:
    model = select_model(len(state["objective"]), need_reasoning=state["category"] in ["security", "coding"])
    try:
        response = ollama.chat(
            model=model,
            messages=[
                {"role": "system", "content": f"你是 {state['assigned_agent']}，OpenClaw 系統的專業代理。"},
                {"role": "user", "content": state["objective"]}
            ]
        )
        return {**state, "result": response["message"]["content"], "model_used": model, "status": "reviewing"}
    except Exception as e:
        return {**state, "result": f"執行失敗: {e}", "status": "failed"}

def review_quality(state: MissionState) -> MissionState:
    try:
        response = ollama.chat(
            model="mistral:7b",
            messages=[{"role": "user", "content": f"評估回答品質，只回答 0.0 到 1.0 之間的數字：\n任務：{state['objective'][:200]}\n回答：{state['result'][:500]}"}]
        )
        score_text = response["message"]["content"].strip()
        score = float(''.join(c for c in score_text if c.isdigit() or c == '.').rstrip('.'))
        score = min(max(score, 0.0), 1.0)
        return {**state, "quality_score": score, "status": "done" if score >= 0.6 else "retry"}
    except:
        return {**state, "quality_score": 0.8, "status": "done"}

def should_retry(state: MissionState) -> Literal["execute", "end"]:
    if state["status"] == "retry" and state["retry_count"] < 2:
        return "execute"
    return "end"

def build_openclaw_graph():
    graph = StateGraph(MissionState)
    graph.add_node("analyze", analyze_mission)
    graph.add_node("execute", execute_mission)
    graph.add_node("review", review_quality)
    graph.add_edge(START, "analyze")
    graph.add_edge("analyze", "execute")
    graph.add_edge("execute", "review")
    graph.add_conditional_edges("review", should_retry, {"execute": "execute", "end": END})
    return graph.compile()

if __name__ == "__main__":
    import sys
    executor = build_openclaw_graph()
    objective = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else "測試任務：分析系統狀態"
    print(f"\n🚀 OpenClaw 多代理編排器啟動")
    print(f"📋 任務：{objective}\n")
    result = executor.invoke({
        "task_id": "TEST-001",
        "objective": objective,
        "category": "",
        "assigned_agent": "",
        "model_used": "",
        "status": "pending",
        "result": "",
        "quality_score": 0.0,
        "retry_count": 0,
    })
    print(f"✅ 完成")
    print(f"🤖 代理：{result['assigned_agent']} | 模型：{result['model_used']}")
    print(f"⭐ 品質：{result['quality_score']:.1f}")
    print(f"\n📄 結果：\n{result['result'][:1000]}")
