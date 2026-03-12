import requests
url = 'http://localhost:3011/api/openclaw/dispatch/toggle'
headers = {'Authorization': 'Bearer oc-oAw9leGU04IAbcS4WN3FC1SH3vq5OdPxrVJCR16iIUMPsep1'}
try:
    r = requests.post(url, headers=headers)
    print(r.json())
except Exception as e:
    print(f'Error: {e}')