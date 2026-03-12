#!/usr/bin/env python3
import json
import sys
import os

def validate_graph_data(file_path):
    """
    驗證 NEUXA 星群所屬的 JSON 數據結構是否符合 v2 標準
    """
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return False

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        required_keys = ['nodes', 'links']
        for key in required_keys:
            if key not in data:
                print(f"Validation Failed: Missing '{key}' root key.")
                return False
        
        # Validate Nodes
        for idx, node in enumerate(data['nodes']):
            if 'id' not in node:
                print(f"Node Error at index {idx}: Missing 'id'.")
                return False
        
        # Validate Links
        for idx, link in enumerate(data['links']):
            if 'source' not in link or 'target' not in link:
                print(f"Link Error at index {idx}: Missing 'source' or 'target'.")
                return False
                
        print(f"Success: {file_path} matches NEUXA v2 schema. (Nodes: {len(data['nodes'])}, Links: {len(data['links'])})")
        return True
    except Exception as e:
        print(f"Validation Error: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 viz_data_validator.py <json_file>")
    else:
        validate_graph_data(sys.argv[1])
