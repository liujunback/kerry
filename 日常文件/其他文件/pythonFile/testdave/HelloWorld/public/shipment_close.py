import json
import requests
import datetime
from ..public.tms_login import login

def shipment_close(shipmentbatchId,shopment_num):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/outbound/send"
    payload = {
            "id": shipmentbatchId,
            "outActual": 2.7,
            "sendDatetime": (datetime.datetime.now()+datetime.timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S'),
            "isWTJFX": 0,
            "scanStatId": 1199,
            "scanStation": "虎门分拨",
            "token":token
    }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    if json.loads(response.text)['message'] == "请求成功":
        print("出货成功："+shopment_num)
        return "出货成功："+shopment_num
    else:
        return "出货失败："+shopment_num
