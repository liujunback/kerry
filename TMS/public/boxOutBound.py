import json

import requests

from TMS.public.Controller_Login import Controller_Login


def box_out_bound(big_bag):
    url = "http://47.107.105.241:22000/controller/operations/inbound/box/boxOutBound"
    token=Controller_Login()
    payload={
        "boxNumber":big_bag,
        "isUseInboundBoxNo":1,
        "boxType":"BAFYL",
        "length":490,
        "width":490,
        "height":630,
        "packWeights":1700
    }
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers = headers, data = json.dumps(payload))

    print("整进整出：" + json.loads(response.text)["msg"])
