import json

import datetime
import urllib

import requests

from TMS.public.TMS_Login import login




def status(tracking_number,statu,message='test'):
    manifest_data=manifestId(tracking_number)
    # print(manifest_data)
    manifestid = manifest_data["manifestId"]
    token = login()
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/manifesttrack/locus/add"

    payload = {
                "scanId": 508,
                "idList": manifestid,
                "scanName": message,
                "scanType": 1,
                "scanCode": statu,
                "scanDatetime": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "scanStation": manifest_data["scanStation"],
                "remark": message,
                "isdefault": 0,
                "token":token
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    # print(payload)
    response = requests.request("POST", url = url, data = payload, headers = headers)
    if json.loads(response.text)['body'] == 1:
        print("补录成功")




def manifestId(tracking_number):
    token = login()
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/manifestmanage/list"

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
    if json.loads(response.text):
        # print(json.loads(response.text)['body']['list'][0]["manifestId"])
        return {"manifestId":json.loads(response.text)['body']['list'][0]["manifestId"],#获取转单号manifestId("KECTH91000794"),
                "scanStation":json.loads(response.text)['body']['list'][0]["destName"]
                }
    else:
        print(response.text)












