import json
import os
from evaluator import calculate_quote, evaluate_lead

def run_pilot():
    data_path = "projects/poll-tex-automation/data/test_leads.json"
    if not os.path.exists(data_path):
        print("Test data not found.")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        leads = json.load(f)

    results = []
    for lead in leads:
        score, reasons = evaluate_lead(lead)
        quote = calculate_quote(lead["windows"])
        
        results.append({
            "lead_id": lead["id"],
            "customer": lead["customer"],
            "priority": "High" if score >= 70 else "Medium" if score >= 40 else "Low",
            "score": score,
            "reasons": reasons,
            "estimated_total": quote["total"],
            "details": quote["details"]
        })

    output_path = "projects/poll-tex-automation/data/pilot_results.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"Pilot completed. Results saved to {output_path}")

if __name__ == "__main__":
    run_pilot()
