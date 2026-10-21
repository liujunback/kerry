import json

import requests

from HelloWorld.public.tms_login import login


def order_box(tracking_number):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/manifestmanage/list"

    payload = {
            "pcs":"",
            "createUserId":"",
            "date1":"0",
            "sdDates":"",
            "isWithStat":"0",
            "sdStatId":"",
            "custType":"",
            "hubInType":"",
            "businessType":"",
            "packType":"",
            "goodsType":"",
            "hubInList":"",
            "destId":"",
            "hubOutType":"",
            "hubOutId":"",
            "deliStatId":"",
            "inventoryType":"",
            "referenceno":"",
            "inventoryStrategyId":"",
            "iscChildCust":"0",
            "ccPayment":"",
            "iscodCharge":"0",
            "isrt":"0",
            "isrr":"0",
            "cocustomType":"",
            "oddNumbers":"",
            "saleEmpId":"",
            "merchandiserEmpId":"",
            "backno":"",
            "isCOD":0,
            "custIdList":"",
            "hubInTypeList":"",
            "basScanStatusList":"",
            "hubTypeList":"",
            "sortCodeList":"",
            "no":tracking_number,
            "noType":5,
            "pageSize":1000,
            "currentPage":"1",
                "token":token
             }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    if json.loads(response.text)['body']['list'][0]:
        return json.loads(response.text)['body']['list'][0]["baggingNo"]
    return "订单没有出库"