#
import datetime
import json

import requests

from TMS.public import TMS_Login
from time import sleep
import time

token=TMS_Login.login()
def delivery(tracking_num):
    param={
        "orderIds": ids(tracking_num),
        "scanStatId": 1,
        "scanStation": "总部",
        "jobnoList": tracking_num,
        "isDqStat": 1,
        "dqStatId": 1,
        "token":token
    }
    response=requests.post("http://120.24.31.239:20000/tms-saas-web/tms/receivefast/openorder/add",data=param)
    print(response.text)
def ids(tracking_number):#获取订单ids
    payload = {
                "platformType":"",
                "isPrint": 0,
                "isQuotationSegment": 0,
                "isCust": 2,
                "code": tracking_number,
                "no": tracking_number,
                "noType": 99,
                "sdDateFirst": "2021-07-22 00:00:00",
                "sdDateLast": "2021-07-23 23:59:59",
                "pageSize": 300,
                "currentPage": 1,
                "token":token
             }
    print(token)
    header={
        "Content-Type":"application/x-www-form-urlencoded"
    }
    response= requests.post(url="http://120.24.31.239:20000/tms-saas-web/tms/order/list",data=payload)
    return json.loads(response.text)['body']['list'][0]['id']

