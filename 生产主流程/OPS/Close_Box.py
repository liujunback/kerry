import json
import requests
import time

from 生产主流程.properties.GetProperties import getProperties
from 生产主流程.public.Ops_Login import Ops_Login


def Close_Box(box_num, tracking_num, properties, token):
    url = properties['ops_url']
    url = url + "/pss/manual/closeBox"
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
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload),verify=False)
    if json.loads(response.text)["code"] == 200:
        print("关箱成功")
    else:

        print(response.text)