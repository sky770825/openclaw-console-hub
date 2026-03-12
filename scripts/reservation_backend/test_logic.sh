#!/bin/bash
PORT=3001
PORT=$PORT node index.js > server.log 2>&1 &
SERVER_PID=$!

sleep 2

echo "Testing Appointment Creation..."
curl -s -X POST http://localhost:$PORT/appointments -H "Content-Type: application/json" -d '{"customer_name": "Alice", "service_id": 1, "staff_id": 101, "start_time": "2023-12-01T10:00:00", "duration_minutes": 60}'

echo -e "\n\nTesting Conflict Detection (Alice overlaps with Bob)..."
curl -s -X POST http://localhost:$PORT/appointments -H "Content-Type: application/json" -d '{"customer_name": "Bob", "service_id": 2, "staff_id": 101, "start_time": "2023-12-01T10:30:00", "duration_minutes": 60}'

echo -e "\n\nUpdating Status to confirmed..."
curl -s -X PATCH http://localhost:$PORT/appointments/1/status -H "Content-Type: application/json" -d '{"status": "confirmed"}'

echo -e "\n\nFinal Appointment List:"
curl -s http://localhost:$PORT/appointments

kill $SERVER_PID
