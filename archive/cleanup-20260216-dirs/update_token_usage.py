
import json
import os
import requests
import subprocess

TOKEN_USAGE_FILE = "token_usage.json"
GATEWAY_URL = os.environ.get("OPENCLAW_GATEWAY_URL", "http://localhost:18789")
GATEWAY_TOKEN = os.environ.get("OPENCLAW_GATEWAY_TOKEN", "")
SESSION_KEY = os.environ.get("OPENCLAW_SESSION_KEY", "agent:main:main") # Assuming main session

def get_session_status(session_key):
    try:
        command = ["/Users/caijunchang/.nvm/versions/node/v22.22.0/bin/openclaw", "status"]
        process = subprocess.run(command, capture_output=True, text=True, check=True)
        
        output = process.stdout
        
        # The original script expects a dict with {"ok": True, "result": {"status": "..."}}
        # We can mimic this structure for the existing parsing logic.
        return {"ok": True, "result": {"status": output}}
        
    except subprocess.CalledProcessError as e:
        print(f"Error executing 'openclaw session_status': {e}")
        print(f"Stderr: {e.stderr}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

def update_token_usage():
    try:
        with open(TOKEN_USAGE_FILE, 'r+') as f:
            data = json.load(f)
            accumulated_tokens = data.get("accumulated_tokens", 0)
            last_updated_session_tokens_in = data.get("last_updated_session_tokens_in", 0)
            last_updated_session_tokens_out = data.get("last_updated_session_tokens_out", 0)

        # Get current session status
        session_status_data = get_session_status(SESSION_KEY)
        # Get current session status from 'openclaw status'
        command = ["/Users/caijunchang/.nvm/versions/node/v22.22.0/bin/openclaw", "status"]
        process = subprocess.run(command, capture_output=True, text=True, check=True)
        status_output = process.stdout

        tokens_in = 0
        tokens_out = 0
        
        # Parse the 'Sessions' table
        lines = status_output.split('\n')
        sessions_table_started = False
        headers = []
        
        for line in lines:
            if "Sessions" in line and not sessions_table_started: # Find the "Sessions" header
                sessions_table_started = True
                continue
            
            if sessions_table_started:
                if line.strip().startswith('┌') or line.strip().startswith('├') or line.strip().startswith('└'):
                    # Skip table separators
                    continue
                
                if not headers and "Key" in line: # This is the header line
                    headers = [h.strip() for h in line.split('│') if h.strip()]
                    continue

                if headers and "agent:main:main" in line: # This is our session's line
                    parts = [p.strip() for p in line.split('│') if p.strip()]
                    if len(parts) == len(headers):
                        session_info = dict(zip(headers, parts))
                        tokens_str = session_info.get("Tokens", "")
                        
                        if tokens_str:
                            # Expected format: "18k/1049k (2%)" or "13 out" for small numbers
                            # We need the "18k" part for 'in' and potentially a raw number for 'out'
                            # The original script uses "Xk in / Y out" pattern, so let's convert
                            
                            if '/' in tokens_str:
                                in_part, out_part_with_context = tokens_str.split('/', 1)
                                
                                # Process 'in_part' (e.g., "18k")
                                if 'k' in in_part:
                                    tokens_in = int(float(in_part.replace('k', '')) * 1000)
                                else:
                                    tokens_in = int(in_part)
                                    
                                # Process 'out_part' (e.g., "1049k (2%)" or "13")
                                out_part = out_part_with_context.split(' ')[0].strip() # Get "1049k" or "13"
                                if 'k' in out_part:
                                    tokens_out = int(float(out_part.replace('k', '')) * 1000)
                                else:
                                    tokens_out = int(out_part)
                            else:
                                # Handle cases where only 'in' might be present or a single number (e.g., "13k")
                                if 'k' in tokens_str:
                                    tokens_in = int(float(tokens_str.replace('k', '')) * 1000)
                                else:
                                    tokens_in = int(tokens_str)
                                tokens_out = 0 # Default if only one value
                            
                            break # Found our session, no need to parse further
                        
        if tokens_in == 0 and tokens_out == 0:
            print("Could not find token information for agent:main:main in session status.")
            # Fallback to previous error behavior if tokens not found
            # This will prevent false accumulation if parsing fails
            return # Exit function to avoid inaccurate cost calculation


        # Calculate new tokens since last update
        new_tokens_in = tokens_in - last_updated_session_tokens_in
        new_tokens_out = tokens_out - last_updated_session_tokens_out
        
        if new_tokens_in > 0 or new_tokens_out > 0:
            accumulated_tokens += new_tokens_in + new_tokens_out
            print(f"Added {new_tokens_in + new_tokens_out} new tokens. Total accumulated: {accumulated_tokens}")
            
            data["accumulated_tokens"] = accumulated_tokens
            data["last_updated_session_tokens_in"] = tokens_in
            data["last_updated_session_tokens_out"] = tokens_out
            
            with open(TOKEN_USAGE_FILE, 'w') as f:
                json.dump(data, f, indent=2)
        else:
            print("No new tokens to add from current session.")

        # Calculate cost and warn
        cost_per_million_tokens = 1.0 / 3.3  # $1 for 3.3 million tokens
        current_cost = (accumulated_tokens / 1_000_000) * cost_per_million_tokens
        
        print(f"Current accumulated cost: ${current_cost:.2f}")

        if current_cost >= 0.95: # Warn at 95 cents
            print(f"Warning: Accumulated token cost is approaching $1.00! Current cost: ${current_cost:.2f}")
        elif current_cost >= 0.5: # Notify at 50 cents
            print(f"Notification: Accumulated token cost is ${current_cost:.2f}")

    except subprocess.CalledProcessError as e:
        print(f"Error executing 'openclaw status': {e}")
        print(f"Stderr: {e.stderr}")
    except Exception as e:
        print(f"An error occurred during token usage update: {e}")

        # Calculate cost and warn
        cost_per_million_tokens = 1.0 / 3.3  # $1 for 3.3 million tokens
        current_cost = (accumulated_tokens / 1_000_000) * cost_per_million_tokens
        
        print(f"Current accumulated cost: ${current_cost:.2f}")

        if current_cost >= 0.95: # Warn at 95 cents
            print(f"Warning: Accumulated token cost is approaching $1.00! Current cost: ${current_cost:.2f}")
        elif current_cost >= 0.5: # Notify at 50 cents
            print(f"Notification: Accumulated token cost is ${current_cost:.2f}")

    except Exception as e:
        print(f"An error occurred during token usage update: {e}")

if __name__ == "__main__":
    update_token_usage()
