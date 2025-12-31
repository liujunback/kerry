import json

import requests

from HelloWorld.public.ops_login import Ops_Login


def Box_scan(box_num):
    token = Ops_Login()
    url = "http://47.107.105.241:22000/controller/receive/box/check?token="+token+"&barCode="+box_num+"&weight=4000"
    payload={}
    headers = {
      'Authorization': token
    }
    response = requests.request("GET", url, headers=headers, data=payload)
    return response.text