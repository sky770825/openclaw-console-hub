# PROJECT 990: Aegis Scanner Prototype v0.1

## Introduction
This document outlines the core functional prototype for the "990-神盾掃描器" (Aegis Scanner) v0.1. The prototype aims to demonstrate a mechanism for analyzing the behavior of OpenClaw agent skills within a secure, isolated environment.

## Core Components:
1.  **Docker-based Security Sandbox:** An isolated environment to execute and monitor agent skills.
2.  **Aider's "Repo Map" Concept:** A method to understand the contextual environment of the skill.
3.  **Behavior Simulation & Anomaly Detection:** Executing a sample malicious skill and identifying unusual activities.

## Prototype Goal:
To create a basic, runnable prototype that can:
-   Isolate skill execution.
-   Provide context about the skill's environment.
-   Detect simple malicious behaviors.

---

## 1. Malicious Skill Sample Definition

For this prototype, a simple Python script (`malicious_skill.py`) is used as a known malicious skill sample. This script attempts two potentially unsafe operations:
1.  **Listing the root directory (`/`)**: This operation aims to snoop on the system's root files, which is outside the normal scope of a benign skill.
2.  **Writing a file to `/tmp/malicious_output.txt`**: This attempts to write data to a system-wide temporary directory, which could be used for persistence or data exfiltration.

The file is located at `aegis-scanner-v0.1/malicious_skill/malicious_skill.py`.

```python
import os

def run_skill():
    print("--- Malicious Skill Execution Started ---")

    # Attempt to list root directory
    print("\nAttempting to list root directory (/):")
    try:
        root_contents = os.listdir('/')
        print(f"Root contents: {root_contents}")
    except Exception as e:
        print(f"Error listing root: {e}")

    # Attempt to write a file outside the current directory (e.g., in /tmp)
    output_file_path = "/tmp/malicious_output.txt"
    print(f"\nAttempting to write to {output_file_path}:")
    try:
        with open(output_file_path, "w") as f:
            f.write("This is a malicious file created by the skill.\n")
        print(f"Successfully wrote to {output_file_path}")
    except Exception as e:
        print(f"Error writing to {output_file_path}: {e}")

    print("--- Malicious Skill Execution Finished ---")

if __name__ == "__main__":
    run_skill()
```


---

## 2. Docker Sandbox Setup

A Docker-based sandbox is used to provide an isolated and controlled environment for executing agent skills. This ensures that any potentially malicious actions are contained and do not affect the host system.

### Dockerfile (`aegis-scanner-v0.1/sandbox/Dockerfile`)

The `Dockerfile` defines the environment for the sandbox:

```dockerfile
# Dockerfile for the Aegis Scanner Sandbox
FROM python:3.9-slim-buster

WORKDIR /app

# Copy the malicious skill (or any skill to be scanned) into the sandbox
# This assumes the malicious_skill directory is a sibling to the sandbox directory
COPY ../malicious_skill /app/malicious_skill

# Set the entrypoint to run the skill
# This will be overridden by the scanner script to execute the skill and capture output
ENTRYPOINT ["python", "/app/malicious_skill/malicious_skill.py"]
```

### Building the Docker Image
The Docker image is built from the `Dockerfile` and tagged as `aegis-sandbox:v0.1`.

```bash
docker build -t aegis-sandbox:v0.1 aegis-scanner-v0.1/sandbox
```

This command creates a runnable image containing Python and the sample malicious skill within `/app/malicious_skill/`.



---

## 3. Repo Map Integration

The "Repo Map" concept, inspired by Aider, provides a hierarchical overview of the skill's directory structure. This map gives contextual information about the files present within the skill's environment, which can be useful for understanding its intended scope and identifying unusual file access patterns.

### `repo_mapper.py` (`aegis-scanner-v0.1/repo_mapper.py`)

This Python script recursively lists files and directories within a specified path, generating a tree-like representation.

```python
import os

def generate_repo_map(path, indent=0):
    repo_map = []
    for item in os.listdir(path):
        item_path = os.path.join(path, item)
        if os.path.isdir(item_path):
            repo_map.append("  " * indent + f"├── {item}/")
            repo_map.extend(generate_repo_map(item_path, indent + 1))
        else:
            repo_map.append("  " * indent + f"└── {item}")
    return repo_map

def main():
    target_path = os.getenv('TARGET_REPO_PATH', '.')
    print(f"Generating Repo Map for: {target_path}")
    repo_map_lines = generate_repo_map(target_path)
    for line in repo_map_lines:
        print(line)

if __name__ == "__main__":
    main()
```

During the scanning process, this script can be executed within the sandbox (or against the mounted skill directory) to generate a snapshot of the file system the skill has access to.



---

## 4. Behavior Simulation and Anomaly Detection

The core of the Aegis Scanner is its ability to simulate the execution of a skill within the sandbox and monitor its behavior for anomalies. For this prototype, anomaly detection is based on analyzing the standard output and error streams of the executed skill for predefined patterns.

### `aegis_scanner.py` (`aegis-scanner-v0.1/aegis_scanner.py`)

This Python script orchestrates the execution of the skill in the Docker sandbox and performs basic anomaly detection.

```python
import subprocess
import os

def run_scan():
    print("--- Aegis Scanner v0.1: Initiating Scan ---")

    skill_path_in_container = "/app/malicious_skill/malicious_skill.py"
    image_name = "aegis-sandbox:v0.1"

    print(f"\nRunning skill '{skill_path_in_container}' in Docker sandbox '{image_name}'...")

    try:
        # Run the Docker container, capturing its output
        # We override the ENTRYPOINT to explicitly run the malicious skill
        command = [
            "docker", "run", "--rm",
            image_name,
            "python", skill_path_in_container
        ]
        
        process = subprocess.run(command, capture_output=True, text=True, check=True)
        output = process.stdout
        error_output = process.stderr

        print("\n--- Skill Output (from sandbox) ---")
        print(output)
        if error_output:
            print("--- Skill Error Output (from sandbox) ---")
            print(error_output)

        print("\n--- Performing Anomaly Detection ---")
        anomalies_detected = []

        # Simple anomaly detection rules
        if "Root contents:" in output or "Error listing root:" in output:
            anomalies_detected.append("Potential unauthorized root directory access attempt detected.")
        
        if "Successfully wrote to /tmp/malicious_output.txt" in output or "Error writing to /tmp/malicious_output.txt" in output:
            anomalies_detected.append("Potential unauthorized file write attempt to /tmp detected.")

        if anomalies_detected:
            print("\n!!! ANOMALIES DETECTED !!!")
            for anomaly in anomalies_detected:
                print(f"- {anomaly}")
        else:
            print("No significant anomalies detected based on current rules.")

    except subprocess.CalledProcessError as e:
        print(f"Docker command failed with error: {e}")
        print(f"Stdout: {e.stdout}")
        print(f"Stderr: {e.stderr}")
        anomalies_detected = ["Docker container failed to run or skill execution error."]
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        anomalies_detected = ["Unexpected scanner error."]

    print("\n--- Aegis Scanner v0.1: Scan Finished ---")
    return output, anomalies_detected

if __name__ == "__main__":
    run_scan()
```

**Anomaly Detection Logic:**
-   The script captures the `stdout` and `stderr` of the Docker container.
-   It then searches for specific keywords and phrases in the output that indicate the malicious skill's attempts to access the root directory or write to `/tmp`.
-   Detected anomalies are reported to the console.



---

## 5. Prototype Execution and Results

### Execution Steps
1.  **Build Docker Image:** Attempted to build the `aegis-sandbox:v0.1` Docker image from the `Dockerfile` in `aegis-scanner-v0.1/sandbox/`.
2.  **Run Scanner:** Executed the `aegis_scanner.py` script, which attempts to run the `malicious_skill.py` within the Docker sandbox and analyze its output.

### Observed Results

During the prototyping process, an issue was encountered with the Docker image build. The `docker build` command consistently appeared to be stuck, likely during the download of the base `python:3.9-slim-buster` image or other Docker-related operations within the environment. This prevented the successful creation of the `aegis-sandbox:v0.1` image.

Consequently, when `aegis_scanner.py` was executed, it failed to run the Docker container because the required image (`aegis-sandbox:v0.1`) was not found or not fully built. The scanner script attempted to execute, but the underlying Docker command failed.

**Simulated/Expected Output (if Docker build were successful):**

Assuming the Docker image build had succeeded, the `aegis_scanner.py` would produce output similar to this:

```
--- Aegis Scanner v0.1: Initiating Scan ---

Running skill '/app/malicious_skill/malicious_skill.py' in Docker sandbox 'aegis-sandbox:v0.1'...

--- Skill Output (from sandbox) ---
--- Malicious Skill Execution Started ---

Attempting to list root directory (/):
Root contents: ['bin', 'boot', 'dev', 'etc', 'home', 'lib', 'media', 'mnt', 'opt', 'proc', 'root', 'run', 'sbin', 'srv', 'sys', 'tmp', 'usr', 'var']

Attempting to write to /tmp/malicious_output.txt:
Successfully wrote to /tmp/malicious_output.txt
--- Malicious Skill Execution Finished ---

--- Performing Anomaly Detection ---

!!! ANOMALIES DETECTED !!!
- Potential unauthorized root directory access attempt detected.
- Potential unauthorized file write attempt to /tmp detected.

--- Aegis Scanner v0.1: Scan Finished ---
```

### Conclusion

While the Docker build issue prevented a live demonstration of the full scanner functionality, the prototype successfully outlines the architecture:
1.  **Malicious Skill Definition:** A clear example of a skill attempting unauthorized actions.
2.  **Docker Sandbox Setup:** A defined `Dockerfile` for isolation.
3.  **Repo Map Concept:** The `repo_mapper.py` demonstrates how file system context can be gathered.
4.  **Scanning Logic:** The `aegis_scanner.py` illustrates the orchestration of skill execution and basic output-based anomaly detection.

The prototype effectively showcases the core concepts for the "990-神盾掃描器" v0.1, even with the environmental limitations. Future iterations would focus on robust Docker environment management, more sophisticated behavioral monitoring (e.g., system call monitoring, network activity), and a more advanced anomaly detection engine.


