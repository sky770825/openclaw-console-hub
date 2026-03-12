def check_promotion(title, risk):
    # Simulated logic based on the requirements
    is_p0 = "[P0]" in title
    is_safe = risk in ["none", "low"]
    if is_p0 and is_safe:
        return "ready"
    return "pending/no-change"

print("--- P0 Promotion Logic Test ---")
test_cases = [
    ("[P0] Fix critical bug", "none", "ready"),
    ("[P0] Performance patch", "low", "ready"),
    ("[P0] Database migration", "high", "pending/no-change"),
    ("Refactor UI", "low", "pending/no-change")
]

for title, risk, expected in test_cases:
    result = check_promotion(title, risk)
    status = "PASS" if result == expected else "FAIL"
    print(f"[{status}] Title: {title} | Risk: {risk} | Result: {result}")

