#!/bin/bash
ROUTE_FILE="/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts"
# Ensure the route is POST /dispatch
if grep -q "router.post('/'" "$ROUTE_FILE"; then
    echo "Fixing route: changing router.post('/') to router.post('/dispatch')"
    sed -i '' "s/router.post('\/')/router.post('\/dispatch')/g" "$ROUTE_FILE"
fi

# Also check if it's router.post('dispatch') missing a slash
if grep -q "router.post('dispatch')" "$ROUTE_FILE"; then
    echo "Fixing route: adding missing slash to router.post('dispatch')"
    sed -i '' "s/router.post('dispatch')/router.post('\/dispatch')/g" "$ROUTE_FILE"
fi
