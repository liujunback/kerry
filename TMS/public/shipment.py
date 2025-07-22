import json

import datetime
import random

import requests

from TMS.public.TMS_Login import login

token = login()

def shipment_add():
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/outbound/add"
    shipment_num = "Back-"+str((datetime.datetime.now()).strftime('%Y%m%d%H%M'))+str(random.randint(1,9999999999))
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
    if json.loads(response.text)['message'] != "EnumResCode.OK":
        print(response.text)
    print(response.text)
    print("出货批次："+shipment_num)
    return shipment_num#出货批次号

def shipment_num_ids(shipment_num):
    shipment_num_ids=""
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/outbound/list"
    payload = {
                "shipmentbatchDatetime": "",
                "shipmentStatid": 1199,
                "shipmentbatchStrategy": "",
                "deliveryAgent": "",
                "shipmentbatchStatus": 0,
                "deliveryAgentStr": "",
                "stDateStart": "",
                "stDateEnd": "",
                "codeType": 84,
                "noStr": shipment_num,
                "pageSize": 50,
                "currentPage": 1,
                "token":token
             }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    #print(response.text)
    if json.loads(response.text)['message'] == "请求成功":
        shipment_num_ids=json.loads(response.text)['body']['list'][0]['id']#出货批次id号

    else:
        print(response.text)
    return shipment_num_ids

def shipment_scan(box_num,shipment_num):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/outbound/scan"
    shipmentbatchId = shipment_num_ids(shipment_num)
    #print(shipmentbatchId)
    payload = {
                "shipmentbatchId": shipmentbatchId,
                "shipmentbatchNo": shipment_num,
                "baggingno": box_num,
                "scanStatId": 1199,
                "token":token
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    #print(response.text)
    if json.loads(response.text)['result_code'] != 0:
        print(response.text)
    print(shipmentbatchId)
    return shipmentbatchId#出货批次id号

def shipment_close(shipmentbatchId,shopment_num):
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/outbound/send"
    payload = {
            "id": shipmentbatchId,
            "outActual": 2.7,
            "sendDatetime": (datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S'),#+datetime.timedelta(minutes=15)
            "isWTJFX": 0,
            "scanStatId": 1199,
            "scanStation": "虎门分拨",
            "token":token
    }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    print(response.text)
    if json.loads(response.text)['message'] == "EnumResCode.OK":
        print("出货成功："+shopment_num)
        return "出货成功："+shopment_num
    else:
        return "出货失败："+shopment_num
#print(shipment_num_ids("Back202107021540"))
#shipment_scan("CACNSGG0021070200017M","Back202107021540")
# print(shipment_add())