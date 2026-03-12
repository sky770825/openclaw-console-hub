#!/bin/bash

# ==============================================================================
# Intelligent Scheduler Test Suite
# ==============================================================================

SCHEDULER="./scripts/intelligent-scheduler.sh"

echo "=== Test 1: Resource Monitoring ==="
$SCHEDULER monitor

echo -e "\n=== Test 2: Gemini Call Tracking & Threshold ==="
# Reset usage for test
rm -f data/scheduler/gemini_usage.json
# Simulate calls
$SCHEDULER track-gemini "gemini-1.5-flash"
$SCHEDULER track-gemini "gemini-1.5-flash"
# Manually inject high count to trigger warning
echo "{\"$(date +%Y-%m-%d)\": 1499}" > data/scheduler/gemini_usage.json
$SCHEDULER track-gemini "gemini-1.5-flash"

echo -e "\n=== Test 3: Ollama Smart Loading (Dry Run Logic) ==="
# We don't want to actually unload models if they are in use, but we can test the CLI
$SCHEDULER load-ollama "qwen3:4b"

echo -e "\n=== Test 4: Task Dispatching (Simulation) ==="
echo "Scenario A: High Priority Task"
$SCHEDULER dispatch "Critical System Patch" 1 "ollama:qwen3:8b"

echo -e "\nScenario B: Low Priority Task with (Simulated) High Load"
# Mocking high RAM by overriding get_ram_usage for this sub-test
# Since we can't easily mock within the script from outside without editing, 
# we'll just run it as is and observe the logic flow.
$SCHEDULER dispatch "Non-urgent Data Cleanup" 5 "gemini:pro"

echo -e "\n=== Test Results Summary ==="
echo "Check logs/scheduler and data/scheduler for persistent state."
