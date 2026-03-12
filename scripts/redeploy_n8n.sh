#!/bin/bash
# Script to redeploy or check n8n status on Zeabur
API_KEY="sk-a7an..."
API_URL="https://gateway.zeabur.com/graphql"
PROJECT_ID=$(curl -s -X POST "$API_URL" -H "Authorization: Bearer $API_KEY" -H "Content-Type: application/json" -d '{"query":"query { projects { _id name } }"}' | jq -r '.data.projects[] | select(.name == "n8n-foundation-5") | ._id' | head -n 1)

if [ -z "$PROJECT_ID" ]; then
    echo "Project not found."
else
    echo "Project found: $PROJECT_ID"
    # Status check logic could go here
fi
