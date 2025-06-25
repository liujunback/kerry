import json

import requests

from TMS.public.Controller_Login import Controller_Login


def check_weight(box_num,tracking_list=3):

    url = "http://47.107.105.241:22000/controller/operations/outbound/checkWeight"
    token = Controller_Login()
    payload={
            "boxTypeCode":"back",
            "boxNumber":box_num,
            "weighingWeight":str(8112),
            "length":450,
            "width":550,
            "height":500,
            "weight":1612
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