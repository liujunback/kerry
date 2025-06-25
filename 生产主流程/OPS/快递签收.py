import json

import datetime
from time import sleep

import requests

url = "http://47.107.105.241:22000/controller/pda/expsign/add"


for i in range(100):
    sleep(1)
    number= "backtest" + str(datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    payload={
        "qty": 0,
        "expCompany": "顺丰",
        "expCompanyId": "11",
        "businessType": "SF",
        "businessTypeId": "20",
        "expTn": number,
        "weight": 120
    }
    headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      'token': '8651a700-916a-4bb9-a6d3-0346f0ec7dd9',
      'Authorization': 'Bearer 8651a700-916a-4bb9-a6d3-0346f0ec7dd9'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    print(number)
