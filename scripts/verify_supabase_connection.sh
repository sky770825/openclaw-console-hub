#!/bin/bash
# Usage: ./verify_supabase_connection.sh <PROJECT_REF> <ANON_KEY>

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <PROJECT_REF> <ANON_KEY>"
    exit 1
fi

PROJECT_REF=$1
ANON_KEY=$2
URL="https://$PROJECT_REF.supabase.co/rest/v1/"

echo "Checking Supabase Connectivity..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" "$URL")

if [ "$RESPONSE" -eq 200 ] || [ "$RESPONSE" -eq 204 ]; then
    echo "Success: Project is reachable and API is active."
    echo "Public schema is accessible via REST interface."
else
    echo "Error: Could not reach project. Status code: $RESPONSE"
    exit 1
fi
