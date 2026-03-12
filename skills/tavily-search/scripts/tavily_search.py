import os
import argparse
import requests
import json

def tavily_search(query, api_key=None):
    if not api_key:
        api_key = os.getenv("TAVILY_API_KEY")

    if not api_key:
        print(json.dumps({"error": "Tavily API Key is not provided. Please set it as an environment variable (TAVILY_API_KEY) or pass it via --api-key argument."}))
        return

    url = "https://api.tavily.com/search"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "query": query,
        "api_key": api_key,
        "search_depth": "advanced",
        "include_answer": True,
        "include_raw_content": False,
        "max_results": 5
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
        
        response_json = response.json()
        print(json.dumps(response_json, ensure_ascii=False, indent=2))

    except requests.exceptions.RequestException as e:
        print(json.dumps({"error": f"Network or API error: {e}"}))
    except json.JSONDecodeError:
        print(json.dumps({"error": "Failed to decode JSON response from Tavily API."}))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {e}"}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Perform a Tavily web search.")
    parser.add_argument("--query", required=True, help="The search query.")
    parser.add_argument("--api-key", help="Your Tavily API Key. Defaults to TAVILY_API_KEY environment variable.")

    args = parser.parse_args()
    tavily_search(args.query, args.api_key)
