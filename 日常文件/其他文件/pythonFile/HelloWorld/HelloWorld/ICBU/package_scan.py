import json

import requests

from HelloWorld.public.ops_login import Ops_Login


def package_scan(tracking_number):
    token = Ops_Login()
    url = "http://47.107.105.241:22000/controller/receive/package/scan"
    payload={
            "token":token,
             "barCodes":[tracking_number]
             }
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    if json.loads(response.text)['code'] != 200:
        print(response.text)
        return response.text
    return "揽收成功"
