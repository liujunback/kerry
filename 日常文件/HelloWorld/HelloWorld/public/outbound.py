from ..public.ops_login import Ops_Login
import requests
import json


def outbound(tracking_number):
    token = Ops_Login()
    url = "http://59.36.186.173:22000/controller/pss/manual/closeBoxScan"
    payload={
            "trackingNumber":tracking_number,
            "boxNumber":"",
            "code":"BAFYL",
            "isReferenceNumber": 0
        }
    headers = {
      'token': token,
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["data"]:
        return json.loads(response.text)["data"]["info"]["boxNumber"]
    print(response.text)
