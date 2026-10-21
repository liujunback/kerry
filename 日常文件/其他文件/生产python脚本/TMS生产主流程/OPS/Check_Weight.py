import json
import requests
import time

from 生产主流程.public.Ops_Login import Ops_Login


def Check_Weight(box_num, properties, token, tracking_list=3):
    url = properties['ops_url']
    url = url + "/operations/outbound/checkWeight"
    payload={
            "boxTypeCode":"BAFYL",
            "boxNumber":box_num,
            "weighingWeight":str(2700),
            "length":490,
            "width":490,
            "height":630,
            "weight":1600
        }
    headers = {
      'token': token,
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["code"] == 200:
        print(json.loads(response.text)["msg"])
    else:
        print(response.text)