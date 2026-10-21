import requests
import json
from ..public.tms_login import login
from ..public.shipment_num_ids import shipment_num_ids

def shipment_scan(box_num,shipment_num):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/outbound/scan"
    shipmentbatchId = shipment_num_ids(shipment_num)
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
    if json.loads(response.text)['message'] != "请求成功":
        print(response.text)
    print(shipmentbatchId)
    return shipmentbatchId#出货批次id号
