from ..public.ops_login import Ops_Login
import requests
import json

def close_box(box_num,tracking_num):
    token = Ops_Login()
    url = "http://59.36.186.173:22000/controller/pss/manual/closeBox"
    payload={
        "trackingNumbers":tracking_num,
        "boxNumber":box_num,
        "code":"BAFYL"
    }
    headers = {
      'Authorization': token,
      'token': token,
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["code"] == 200:
        return "关箱成功:"+box_num
    else:
        return response.text
