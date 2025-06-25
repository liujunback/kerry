import json
import requests
import time

from 生产主流程.properties.GetProperties import getProperties
from 生产主流程.public.Ops_Login import Ops_Login

def Outbound_Scan(tracking_number, properties, token, box_num=""):
    url = properties['ops_url']
    url = url + "/pss/manual/closeBoxScan"
    payload={
        "trackingNumber":tracking_number,
         "boxNumber":box_num,
        "isReferenceNumber":0,
        "code":"BAFYL"}
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload),verify=False)
    if json.loads(response.text)["code"] == 200:
        print("Box_num: "+json.loads(response.text)["data"]["info"]["boxNumber"])
    else:
        print(response.text)
    return json.loads(response.text)["data"]["info"]["boxNumber"]