import requests
import json
from ..public.tms_login import login

def shipment_num_ids(shipment_num):
    token = login()
    shipment_num_ids=""
    url = "http://120.24.31.239:20000/tms-saas-web/tms/outbound/list"
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
    if json.loads(response.text)['body']['footer'][0]['count'] == 1:
        shipment_num_ids=json.loads(response.text)['body']['list'][0]['id']#出货批次id号
    else:
        print(response.text)
    return shipment_num_ids
