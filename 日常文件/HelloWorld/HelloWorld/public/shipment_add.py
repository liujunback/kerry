import requests
import json
from ..public.tms_login import login
import datetime
import random

def shipment_add():
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/outbound/add"
    shipment_num = "Back"+str((datetime.datetime.now()+datetime.timedelta(minutes=480)).strftime('%Y%m%d%H%M'))
    payload = {
                "shipmentbatchNo": shipment_num,
                "shipmentbatchStrategy": 27,
                "shipmentStatid": 1199,
                "remark":"",
                "deliveryAgent": "894",
                "deliveryDriver": "back",
                "deliveryDriverPhone": "12455657",
                "deliveryDriverCarno":"",
                "token":token
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    if json.loads(response.text)['message'] != "请求成功":
        print(response.text)
    return shipment_num#出货批次号
