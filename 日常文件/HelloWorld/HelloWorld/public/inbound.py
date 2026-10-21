import json
import requests

from ..public.ops_login import Ops_Login

def inbound(tracking_number):
    token = Ops_Login()
    url = "http://59.36.186.173:22000/controller/inbound/package/hand"
    payload = {
               "isVol":0,
               "isPrint":0,
               "trackingNumber":tracking_number,
               "token":token,
               "weight":1100
              }
    headers = {
              'Authorization': token,
              'Content-Type': 'application/json'
              }
    response = requests.request("POST", url, headers = headers, data = json.dumps(payload))
    if json.loads(response.text)['code'] == 200:
        return "入库成功"
    else:
        response = requests.request("POST", url, headers = headers, data = json.dumps(payload))
        return json.loads(response.text)
