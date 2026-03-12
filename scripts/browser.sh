#!/bin/bash
# Browser: Dynamic browsing simulation tool
URL=$1
echo "Browser: Navigating to $URL ..."
if [[ "$URL" == http* ]]; then
    curl -s -I "$URL" | head -n 1
else
    if [[ -f "$URL" ]]; then
        echo "Browser: Content of local file $URL:"
        cat "$URL" | head -n 20
    else
        echo "Browser: Cannot access $URL"
    fi
fi
