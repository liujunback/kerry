import json

import requests

from ..public.ops_login import Ops_Login


def check_weight(box_num,tracking_list):

    url = "http://59.36.186.173:22000/controller/operations/outbound/checkWeight"
    token = Ops_Login()
    payload={
            "boxTypeCode":"BAFYL",
            "boxNumber":box_num,
            "weighingWeight":str(1100*len(tracking_list)+1600),
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
