import json

import requests
from TMS.public.Controller_Login import Controller_Login

def close_Box_Scan(tracking_number,box_num=""):

    token = Controller_Login()
    import requests

    url = "https://ops-eng-uat.kec-app.com/controller/pss/manual/closeBoxScan"

    payload={
        "trackingNumber":tracking_number,
             "boxNumber":box_num,
        "isReferenceNumber":0,
        "code":"back"}
    headers = {
      'token': token,
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["code"] == 200:
        print("Box_num: "+json.loads(response.text)["data"]["info"]["boxNumber"])
    else:
        print(response.text)
    return json.loads(response.text)["data"]["info"]["boxNumber"]

def close_Box(box_num,tracking_num):
    url = "https://ops-eng-uat.kec-app.com/controller/pss/manual/closeBox"
    token = Controller_Login()
    payload={
        "trackingNumbers":tracking_num,
        "isReferenceNumber":0,
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
        print("关箱成功")
    else:

        print(response.text)
