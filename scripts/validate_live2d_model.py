import os
import json
import sys

def validate_model_json(file_path):
    print(f"Checking Live2D model config: {file_path}")
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        required_keys = ["Version", "FileReferences"]
        for key in required_keys:
            if key not in data:
                print(f"Missing required key: {key}")
                return False
        
        # Check for moc3 file
        moc_file = data["FileReferences"].get("Moc")
        if not moc_file:
            print("Error: No .moc3 file reference found.")
            return False
            
        print("Success: Live2D model configuration is valid.")
        return True
    except Exception as e:
        print(f"Validation failed: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 validate_live2d_model.py <path_to_model3_json>")
    else:
        validate_model_json(sys.argv[1])
