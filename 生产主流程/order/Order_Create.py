import json

import datetime
import random

import requests

import urllib3

from urllib3.exceptions import InsecureRequestWarning

import time


urllib3.disable_warnings(InsecureRequestWarning)

def Order_Create(properties,token):

    url = properties['url']
    order_url = properties['order_txt']
    header = {
        'Content-Type':'application/json',
        "Authorization":"Bearer" + " "+token
        }
    with open("../../生产主流程/data/" + order_url, 'r',encoding= 'utf-8') as f:
        param2 = json.loads(f.read())#转换成字典
        f.close()
    reference_number = "ITTEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300))

    param2['package']['reference_number'] = reference_number
    # param2['package']['tracking_number'] = "ITTEST20240920004"
    url = url+"pos-web/shipment/create"
    time_start = time.time()
    response = requests.post(url ,data=json.dumps(param2), headers = header,verify=False)
    time_end = time.time()
    print('下单耗时：', round(time_end - time_start, 2), 's')
    if response.status_code == 201:
        print(reference_number)
        print("下单成功:" + response.text)
        # print(json.loads(response.text)["data"]["tracking_number"])
        return json.loads(response.text)["data"]["tracking_number"]
        # print(json.loads(response.text)["data"]["label_url"])
    else:
        print(reference_number)
        print("失败：" + response.text + "\n" + reference_number)
        return "失败"
