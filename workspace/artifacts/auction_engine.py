import json
import os

def run_auction():
    output_dir = "/Users/sky770825/.openclaw/workspace/sandbox/output"
    
    with open(f"{output_dir}/models_registry.json", "r") as f:
        models = json.load(f)
    
    with open(f"{output_dir}/task_queue.json", "r") as f:
        tasks = json.load(f)
        
    results = []
    
    for task in tasks:
        task_id = task["id"]
        difficulty = task["difficulty"]
        # Threshold: Model capability must be at least difficulty * 10
        min_capability = difficulty * 10
        
        bids = []
        for model in models:
            if model["capability"] >= min_capability:
                # Calculate Cost Performance Ratio (Value Score)
                # Formula: Capability / (Cost * Weighting)
                # We want higher capability for lower cost.
                cost_estimate = (task["estimated_tokens"] / 1000) * model["cost_per_1k"]
                # Avoid division by zero, though cost is > 0
                efficiency_score = model["capability"] / (cost_estimate if cost_estimate > 0 else 0.00001)
                
                bids.append({
                    "model": model["name"],
                    "estimated_cost": cost_estimate,
                    "efficiency_score": efficiency_score,
                    "capability": model["capability"]
                })
        
        # Sort bids by efficiency_score descending
        bids.sort(key=lambda x: x["efficiency_score"], reverse=True)
        
        winner = bids[0] if bids else None
        
        results.append({
            "task_id": task_id,
            "task_name": task["name"],
            "difficulty": difficulty,
            "winner": winner["model"] if winner else "NO_SUITABLE_MODEL",
            "estimated_cost": winner["estimated_cost"] if winner else 0,
            "all_bids": bids
        })
        
    with open(f"{output_dir}/auction_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    # Generate Markdown Report
    with open(f"{output_dir}/auction_report.md", "w") as f:
        f.write("# Task Auction System Report\n\n")
        f.write("| Task ID | Task Name | Difficulty | Assigned Model | Est. Cost | Efficiency Score |\n")
        f.write("|---------|-----------|------------|----------------|-----------|------------------|\n")
        for res in results:
            if res["winner"] != "NO_SUITABLE_MODEL":
                w = res["all_bids"][0]
                f.write(f"| {res['task_id']} | {res['task_name']} | {res['difficulty']} | {res['winner']} | ${res['estimated_cost']:.6f} | {w['efficiency_score']:.2f} |\n")
            else:
                f.write(f"| {res['task_id']} | {res['task_name']} | {res['difficulty']} | NONE | N/A | N/A |\n")

if __name__ == "__main__":
    run_auction()
