import requests
import json

url = "https://foms-api.kec-app.com/user/login"

payload = json.dumps({
  "username": "backtest.backtest",
  "password": "123456.backT"
})
headers = {
  'Content-Type': 'application/json'}

response = requests.request("POST", url, headers=headers, data=payload)
if response.status_code == 200:
    result = json.loads(response.text)
    if result.get("code") == 200:
        token = result['data']['token']
        print(token)
print(response.text)
