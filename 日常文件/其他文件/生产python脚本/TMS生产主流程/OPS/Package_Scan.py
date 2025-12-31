import json
import requests
import time

from 生产主流程.properties.GetProperties import getProperties
from 生产主流程.public.Ops_Login import Ops_Login



def Package_Scan(tracking_number,properties):
    token=Ops_Login()
    url = properties['ops_url']
    url = url + "/controller/receive/package/scan"
    tracking_number_list = [tracking_number]
    payload={
            "token":token,
             "barCodes":tracking_number_list,
            "type":0
    }
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)['code'] != 200:
        print(response.text)
    else:
        print("揽收成功")