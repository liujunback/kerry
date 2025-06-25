import json

import requests

from TMS.public.Controller_Login import Controller_Login


def package_scan(tracking_number):
    token=Controller_Login()
    url = "http://47.107.105.241:22000/controller/receive/package/scan"
    tracking_number_list = []
    tracking_number_list.append(tracking_number)
    payload={
            "token":token,
            "barCodes":tracking_number_list,
            "type":0
        }
    headers = {
      'token': token,
        "Authorization":token,
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)['code'] != 200:
        print(response.text)
    else:
        print("揽收成功")
def Box_scan(box_num):
    token=Controller_Login()
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
    url = "http://47.107.105.241:22000/controller/receive/box/check?token="+token+"&barCode="+box_num+"&weight=4000"
    response = requests.get(url,headers = headers)
    if json.loads(response.text)['code'] != 200:
        print(response.text)
    print(json.loads(response.text)['data']["barCode"])

