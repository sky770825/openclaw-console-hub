
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
