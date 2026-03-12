from caspe_agent import CASPEAgent
import json

def test_prototype():
    policy_path = "policies.yaml"
    graph_path = "system_graph.json"
    
    agent = CASPEAgent(policy_path, graph_path)
    violations = agent.run()
    
    print("\n--- CASPE Analysis Results ---")
    if not violations:
        print("No violations found. System is compliant.")
    else:
        print(f"Found {len(violations)} violations:")
        for v in violations:
            print(f"\n[!] {v['type']} (Policy: {v['policy_id']})")
            print(f"    Message: {v['message']}")
            print(f"    Suggestion: {v['suggestion']}")

    with open("../runs/2026-02-17/run-001/test_results.json", "w") as f:
        json.dump(violations, f, indent=2)

if __name__ == "__main__":
    test_prototype()
