import json

import requests
import time

from TMS.public.Controller_Login import Controller_Login



def big_bag_inbound(big_bag):
    token=Controller_Login()
    url = "https://ops-eng-uat.kec-app.com/controller/operations/inbound/box/boxInBound"
    payload={
            "operationType":"",
            "weights":"2323",
            "lengths":"",
            "widths":"",
            "heights":"",
            "boxType":"",
            "token":token,
            "inBoundBoxNumber":big_bag,
            "operationTypeCode":[

            ]
        }
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
    time_start = time.time()
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    print(json.loads(response.text)["msg"])
