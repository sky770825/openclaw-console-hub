#!/usr/bin/env python3
import sys
import json
import argparse
import requests

BASE_URL = "http://localhost:3000/api" # Default port assumption

def manage_resource(resource, action, data=None, id=None):
    url = f"{BASE_URL}/{resource}"
    if id:
        url = f"{url}/{id}"
    
    headers = {'Content-Type': 'application/json'}
    
    try:
        if action == 'list':
            r = requests.get(url)
        elif action == 'create':
            r = requests.post(url, json=data, headers=headers)
        elif action == 'update':
            r = requests.put(url, json=data, headers=headers)
        elif action == 'delete':
            r = requests.delete(url)
        else:
            print(f"Unknown action: {action}")
            return

        print(json.dumps(r.json(), indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error connecting to API: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Beauty Web Admin CLI Tool")
    parser.add_argument("resource", choices=['users', 'shops', 'services', 'appointments'], help="Resource to manage")
    parser.add_argument("action", choices=['list', 'create', 'update', 'delete'], help="Action to perform")
    parser.add_argument("--id", help="Resource ID")
    parser.add_argument("--data", help="JSON data for create/update")

    args = parser.parse_args()
    payload = json.loads(args.data) if args.data else None
    manage_resource(args.resource, args.action, payload, args.id)
