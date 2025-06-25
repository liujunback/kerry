import json
import random

import datetime
import requests
import time


def spider(tracking_number):
    import requests
    import json

    url = "http://stg.spider.tec-api.com:38005/package/tracking/kerryth"

    payload = json.dumps({
      "req": {
        "status": {
          "status_date": str((datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S')),
          "timezone": "+01:00",
          "status_code": "POD",
          "status_desc": "test",
          "location": "",
          "con_no": tracking_number
        }
      }
    })
    headers = {
      'Authorization': 'Bearer test123token',
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    print(response.text)

