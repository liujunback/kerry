import json
import urllib
from time import sleep

import requests

from HelloWorld.public.tms_login import login


def Order_Inquire(ref_num):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/order/list"
    payload = {
                "platformType":"",
                "isPrint": 0,
                "isQuotationSegment": 0,
                "isCust": 2,
                "code": ref_num,
                "no": ref_num,
                "noType": 99,
                "sdDateFirst": "2021-07-22 00:00:00",
                "sdDateLast": "2021-07-23 23:59:59",
                "pageSize": 300,
                "currentPage": 1,
                "token":token
             }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = urllib.parse.urlencode(payload), headers = headers)
    if json.loads(response.text)['body']['lastPage'] !=1:
        print(response.text)
        return "没有订单"
    return json.loads(response.text)['body']['list'][0]['jobno']#获取转单号码
