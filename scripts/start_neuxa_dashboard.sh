#!/bin/bash
# Script to run the NEUXA Dashboard Simulator
export OUTPUT_DIR="/Users/caijunchang/.openclaw/workspace/sandbox/output/neuxa_dashboard"
PYTHON_SIM="/Users/caijunchang/.openclaw/workspace/scripts/ai_state_simulator.py"

echo "Launching NEUXA State Simulator..."
# Run simulation in loop for 60 seconds (as a demonstration)
for i in {1..30}
do
   python3 "$PYTHON_SIM"
   sleep 2
done &

echo "Dashboard is ready at: $OUTPUT_DIR/index.html"
echo "To view it, open the index.html file in your browser."
