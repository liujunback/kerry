import json

import datetime
import requests



def shipment_add(properties,token):
    url = properties['tms_url']
    url = url + "tms-saas-web/tms/outbound/add"
    shipment_num = "TESTBACK-"+str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))
    payload = {
                "shipmentbatchNo": shipment_num,
                "shipmentbatchStrategy": int(properties['shipment_batch_Strategy']),
                "shipmentStatid": int(properties['shipment_Stat_id']),
                "remark":"",
                "deliveryAgent": properties['delivery_Agent'],
                "deliveryDriver": "back",
                "deliveryDriverPhone": "1234567",
                "deliveryDriverCarno":"",
                "companyId":1,
                "id":92,
                "outActual":0,
                "verifyType":1,
                "token":token
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers,verify=False)
    if json.loads(response.text)['message'] != "EnumResCode.OK":
        print("出货批次："+shipment_num)
    return shipment_num#出货批次号

def shipment_num_ids(shipment_num, properties, token):
    url = properties['tms_url']
    url = url + "/tms-saas-web/tms/outbound/list"
    payload = {
                "shipmentbatchDatetime": "",
                "shipmentStatid": int(properties['shipment_Stat_id']),
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
    if json.loads(response.text)['body']['footer'][0]['count'] == 1:
        return json.loads(response.text)['body']['list'][0]['id']#出货批次id号
    else:
        print(response.text)

def shipment_scan(box_num, shipment_num, properties, token):
    url = properties['tms_url']
    url = url + "/tms-saas-web/tms/outbound/scan"
    shipmentbatchId = shipment_num_ids(shipment_num, properties, token)
    payload = {
                "shipmentbatchId": shipmentbatchId,
                "shipmentbatchNo": shipment_num,
                "baggingno": box_num,
                "scanStatId": int(properties['shipment_Stat_id']),
                "token":token
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    if json.loads(response.text)['message'] != "EnumResCode.OK":
        print("出货批次ID: " + str(shipmentbatchId))
    else:
        print("出货失败" + json.loads(response.text))
    return shipmentbatchId#出货批次id号

def shipment_close(shipmentbatchId, shopment_num, properties, token):
    url = properties['tms_url']
    url = url + "/tms-saas-web/tms/outbound/send"
    payload = {
            "id": shipmentbatchId,
            "outActual": 2.7,
            "sendDatetime": (datetime.datetime.now()).strftime('%Y-%m-%d %H:%M:%S'),
            "isWTJFX": 0,
            "scanStatId": 1130,
            "scanStation": "虎门分拨",
            "token":token
    }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    if json.loads(response.text)['message'] == "请求成功":
        print("出货成功："+shopment_num)
    else:
        print(response.text)