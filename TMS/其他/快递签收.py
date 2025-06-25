import json

import datetime
import random
from time import sleep

import requests

url = "http://47.107.105.241:22000/controller/pda/expsign/add"


for i in range(30):
    sleep(1)
    payload={
        "qty": 0,
        "expCompany": "圆通",
        "expCompanyId": "9",
        "businessType": "backtest",
        "businessTypeId": "20",
        "expTn": "BACK"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300)),
        "weight": 120
    }
    headers = {
      'Content-Type': 'application/json;charset=UTF-8',
      'token': '2bb9f9ad-5e40-42ed-984f-54abb5b1c487',
      'Authorization': 'Bearer 2bb9f9ad-5e40-42ed-984f-54abb5b1c487'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    print(response.text)
