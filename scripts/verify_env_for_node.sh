#!/bin/bash
echo "--- Environment Check ---"
echo "PATH: $PATH"
echo "Node location: $(which node)"
echo "Process Exec Path (if run via node):"
node -e "console.log(process.execPath)"
echo "--- Testing nohup node ---"
nohup node -e "console.log('Nohup Node Test Success')" > /tmp/nohup_test.log 2>&1
cat /tmp/nohup_test.log
