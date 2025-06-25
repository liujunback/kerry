
# for a in range(1):
import json
import random

import time

import requests

from TMS.public.Controller_Login import Controller_Login
from TMS.public.Login import login


def date(pakege_list):
    date={"bag_id":"","bag_weight":"27226","bag_length":"312","bag_width":10,"bag_height":2}
    date["bag_id"]="ITTES"+str(random.randint(1,9999999999))
    x=[]
    for i in range(pakege_list):
        with open("../file_data/order_data.txt", 'r',encoding= 'utf-8') as f:
            a = json.loads(f.read())#转换成字典
            f.close()
        a["package"]["reference_number"]="TEST20210907"+str(random.randint(1,10000000))
        x.append(a)
    date["package_list"]=x

    return date

def create_big_box_id(pakege_list):

    token=login()
    header={"Content-Type":"application/json","Authorization":"Bearer "+token}
    # url = "http://120.78.66.231:8000/pos-web/shipment/create/multiple"
    url = "http://47.119.120.7:8000/pos-web/shipment/create/multiple"
    data = json.dumps(date(pakege_list))
    # print(data)
    r1=requests.post(url,data=data,headers=header)
    request=json.loads(json.dumps(r1.text))
    print("order:"+request)
    return json.loads(r1.text)["data"]["bag_id"]

def big_box(box_num):
    import requests
    token=Controller_Login()

    url = "http://47.107.105.241:22000/controller/operations/inbound/box/boxInBound"

    payload={
            "operationType":"",
            "weights":"2423",
            "lengths":"",
            "widths":"",
            "heights":"",
            "boxType":"",
            "token":token,
            "inBoundBoxNumber":box_num,
            "operationTypeCode":[

            ]
        }
    headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))

    print(response.text)
    time.sleep(200)
    url = "http://47.107.105.241:22000/controller/operations/inbound/box/boxOutBoundCheckWeight"
    payload={"boxType":"bafyl",
             "token":token,
            "boxNumber":box_num,
            "weights":"1900.000",
             "length":490,"width":490,"height":630,"packWeights":1700
             }
    headers = {
      'token': token,
      'Authorization': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)

    print(response.text)

