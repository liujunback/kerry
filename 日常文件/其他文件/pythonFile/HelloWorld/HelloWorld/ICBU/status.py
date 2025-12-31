import json

import datetime
import urllib

import requests

from HelloWorld.public.tms_login import login


def state(tracking_number,statu,message='test'):
    manifestid = manifestId(tracking_number)
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/manifesttrack/locus/add"

    payload = {
                "scanId": 508,
                "idList": manifestid,
                "scanName": message,
                "scanType": 1,
                "scanCode": statu,
                "scanDatetime": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')+datetime.timedelta(days=1),
                "scanStation": "泰国",
                "remark": message,
                "isdefault": 0,
                "token":token
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    return response.text




def manifestId(tracking_number):
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
    print(json.loads(response.text)['body']['lastPage'])
    if json.loads(response.text)['body']['list'] is not None:
        return json.loads(response.text)['body']['list'][0]["manifestId"]#获取转单号manifestId("KECTH91000794")
    else:
        print(response.text)


