import json

import datetime
import requests

from TMS.public.TMS_Login import login


Tms_Url = "http://120.24.31.239:20000"
token = login()
headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }

class Shipment:
    def shipment_add(slef):#创建批次号
        url = Tms_Url + "/tms-saas-web/tms/outbound/add"
        shipment_num = "Back"+str((datetime.datetime.now()).strftime('%Y%m%d%H%M'))
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

        response = requests.request("POST", url = url, data = payload, headers = headers)
        if json.loads(response.text)['message'] != "EnumResCode.OK":
            print(response.text)
        print("出货批次："+shipment_num)
        return shipment_num#出货批次号

    def shipment_num_ids(shipment_num):#获取批次id号
        shipment_num_ids=""
        url = Tms_Url + "/tms-saas-web/tms/outbound/list"
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
        response = requests.request("POST", url = url, data = payload, headers = headers)
        if json.loads(response.text)['body']['footer'][0]['count'] == 1:
            shipment_num_ids=json.loads(response.text)['body']['list'][0]['id']#出货批次id号
        else:
            print(response.text)
        return shipment_num_ids

    def shipment_scan(box_num,shipment_num):#
        url = Tms_Url + "/tms-saas-web/tms/outbound/scan"
        shipmentbatchId = Shipment.shipment_num_ids(shipment_num)
        payload = {
                    "shipmentbatchId": shipmentbatchId,
                    "shipmentbatchNo": shipment_num,
                    "baggingno": box_num,
                    "scanStatId": 1199,
                    "token":token
                }

        response = requests.request("POST", url = url, data = payload, headers = headers)
        if json.loads(response.text)['message'] != "EnumResCode.OK":
            print(response.text)
        print(shipmentbatchId)
        return shipmentbatchId#出货批次id号

    def shipment_close(shipmentbatchId,shopment_num):
        url = Tms_Url + "/tms-saas-web/tms/outbound/send"
        payload = {
                "id": shipmentbatchId,
                "outActual": 2.7,
                "sendDatetime": (datetime.datetime.now()+datetime.timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S'),
                "isWTJFX": 0,
                "scanStatId": 1199,
                "scanStation": "虎门分拨",
                "token":token
        }
        response = requests.request("POST", url = url, data = payload, headers = headers)
        if json.loads(response.text)['message'] == "EnumResCode.OK":
            print("出货成功："+shopment_num)
            return "出货成功："+shopment_num
        else:
            return "出货失败："+shopment_num
