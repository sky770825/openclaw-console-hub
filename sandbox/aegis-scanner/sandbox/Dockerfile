
# Dockerfile for the Aegis Scanner Sandbox
FROM python:3.9-slim-buster

WORKDIR /app

# Copy the malicious skill (or any skill to be scanned) into the sandbox
# This assumes the malicious_skill directory is a sibling to the sandbox directory
COPY ../malicious_skill /app/malicious_skill

# Set the entrypoint to run the skill
# This will be overridden by the scanner script to execute the skill and capture output
ENTRYPOINT ["python", "/app/malicious_skill/malicious_skill.py"]
