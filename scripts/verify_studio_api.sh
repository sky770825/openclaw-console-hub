#!/bin/bash
echo "Verifying Studio API implementation..."

# Check studio.ts
if [ -f "/Users/sky770825/.openclaw/workspace/sandbox/output/server/src/routes/studio.ts" ]; then
    echo "✓ studio.ts created in output."
else
    echo "✗ studio.ts missing."
    exit 1
fi

# Check index.ts modification
if grep -q "import studioRouter from \"./routes/studio\"" "/Users/sky770825/.openclaw/workspace/sandbox/output/server/src/index.ts"; then
    echo "✓ studioRouter imported in index.ts."
else
    echo "✗ studioRouter import missing in index.ts."
    exit 1
fi

if grep -q "app.use(\"/api/studio\", studioRouter)" "/Users/sky770825/.openclaw/workspace/sandbox/output/server/src/index.ts"; then
    echo "✓ studioRouter mounted in index.ts."
else
    echo "✗ studioRouter mount missing in index.ts."
    exit 1
fi

echo "Verification successful!"
