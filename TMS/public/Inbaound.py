import json
import requests
import time
from TMS.public.Controller_Login import Controller_Login

def inbound(tracking_number):
    token=Controller_Login()
    url = "https://ops-eng-uat.kec-app.com/controller/inbound/package/hand"

    payload={
            "token":token,
            "height":100,
            "isPrint":0,
            "isVol":1,
            "length":1000,
            "trackingNumber":tracking_number,
            "width":300,
            "weight":1100,
    "imgBase64":"",
    "isPreviewInput":0
        }
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["code"] != 200:
        print(response.text)
    print(json.loads(response.text)["msg"])
