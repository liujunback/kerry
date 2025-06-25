import json

import requests

url = "https://spider.kec-app.com/package/booking"

with open("../data/order_data.txt", 'r',encoding= 'utf-8') as f:
        a = json.loads(f.read())#转换成字典
        f.close()
        payload=a
headers = {
  'Authorization': 'Bearer Qrc1KwqsadCBKZNM8JZrHu1wPZn0OhZ8Q1LYr6PM9c6LmRqWfKTxYtEOjsYi',
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)
