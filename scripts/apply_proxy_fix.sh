#!/bin/bash
# This script provides the instructions/commands to fix the ask_ai config issue.
# The issue is typically that Axios tries to use both a custom HttpsProxyAgent AND 
# the system proxy environment variables, causing a conflict.

echo "Recommended Fix for server/src/telegram/action-handlers.ts (or ai utility):"
echo "1. Ensure 'proxy: false' is added to the axios config when using an HttpsProxyAgent."
echo "2. Verify that the proxy URL starts with http:// or https://"
echo ""
echo "Suggested code change:"
echo "----------------------"
echo "const agent = new HttpsProxyAgent(proxyUrl);"
echo "const response = await axios.post(url, data, {"
echo "  httpsAgent: agent,"
echo "  proxy: false, // Critical fix"
echo "  ..."
echo "});"
