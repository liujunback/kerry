import json
import urllib
from time import sleep

import requests
from TMS.public.TMS_Login import login

def Order_Inquire(ref_num):

    response =requests.post(url = "http://120.24.31.239:20000/tms-saas-web/user/login?userNo=KEC064&password=123465&companyNo=&domain=")
    # print(response.text)
    token = json.loads(response.text)["body"]["token"]

    url = "http://120.24.31.239:20000/tms-saas-web/tms/order/list"
    payload = {
                "reName": "",
                "sdName": "",
                "iswithhold": 0,
                "isprintLabel": "",
                "codeType": 99,
                "jobnoStr": "",
                "withStatId": "",
                "sdDates": "",
                "orderState": "",
                "custIdList": "",
                "hubInIdList": "",
                "hubOutId": "",
                "startDate": "",
                "endDate": "",
                "destId": "",
                "isWithStat": 1,
                "orderMode": "",
                "query": 0,
                "platformType": "",
                "isPrint": 0,
                "isQuotationSegment": 0,
                "iscChildCust": 0,
                "isExclusion": 0,
                "custType": "",
                "isCust": 2,
                "code": ref_num,
                "no": ref_num,
                "noType": 99,
                "pageSize": 3000,
                "currentPage": 1,
                 "token":token
            }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = urllib.parse.urlencode(payload), headers = headers,cookies=response.cookies)
    # print(response.text)
    if json.loads(response.text)['body']['lastPage'] !=1:
        print(response.text)
        sleep(3)
        response = requests.request("POST", url = url, data = urllib.parse.urlencode(payload), headers = headers)
        # return json.loads(response.text)['body']['list'][0]['jobno']

    return json.loads(response.text)['body']['list'][0]['jobno']#获取转单号码


# Order_Inquire("KECTH91185840")