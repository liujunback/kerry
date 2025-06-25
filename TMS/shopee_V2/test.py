import random
import datetime
from time import sleep

import requests
import json


for i in range(1000):
    url = "http://stg.spider.tec-api.com:38005/package/tracking/kerryth"

    payload = json.dumps({
      "req": {
        "status": {
          "status_date": (datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S'),
          "timezone": "+01:00",
          "status_code": "010",
          "status_desc": "te1st1" + (datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S'),
          "location": "",
          "con_no": "KECTH91185634"
        }
      }
    })
    headers = {
      'Authorization': 'Bearer test123token',
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    print(response.text)
    sleep(1)
