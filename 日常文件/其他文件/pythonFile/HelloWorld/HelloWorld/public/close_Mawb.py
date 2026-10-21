import datetime
import json
import random

import requests
import time

from HelloWorld.public.tms_login import login


def select_BoxId(box_num):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawb/bagging/list"
    payload = {
        "codeType":"7",
        "code":box_num,
        "sdDateFirst": "2021-08-03 00:00",
        "sdDateLast": "2021-09-02 23:59",
        "nextStatId":"",
        "baggingState":3,
        "posStatId": 1,
        "dataType": 7,
        "pageSize": 500,
        "currentPage": 1,
        "token":token
    }
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["body"]["list"]:
        return json.loads(response.text)["body"]["list"][0]["id"]
    else:
        print(response.text)

def scan_box(box_num,mawb,mawb_id):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawb/selbagging/selectBagging"
    payload = {
        "id":mawb_id,
        "oawbNo": mawb,
        "baggingIdList":select_BoxId(box_num),
        "scanStatId": "1",
        "baggingStatId":"1",
        "dataType":"7",
        "token":token
    }
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["body"]:
        print("扫描箱子成功："+box_num)

def close_mawb(mawb,mawb_id):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawbtrack/dtl/add"
    payload = {
            "autoConfirm":0,
            "departureRouteName":"测试11",
            "destCode":"",
            "flipRuleId":"238",
            "hubOutIdList":"",
            "id":mawb_id,
            "nextStation":"广州分部",
            "oawbNo":mawb,
            "outActual":5.3,
            "outPcs":0,
            "remark":"",
            "scanEr":0,
            "scanSc":0,
            "startCity":"sz",
            "tdActual":11,
            "tdPcs":10,
            "tdVol":12,
            "tdWeig":12,
            "totalActual":3.6,
            "totalBagPcs":1,
            "totalCount":"3",
            "totalPcs":"3",
            "transportType":"1",
            "mawbNo1":"1234"+str(random.randint(0,99999)),
            "oawbState":3,
            "token":token,
            "oawbShipStr":str([{"arriveCity":"gz","arriveTime":1630936774000,"companyId":1,"createDatetime":1630907974000,"createUserName":"哲盟用户","id":5444,"isdel":0,"oawbId":2942,"routeType":"2","shipId":1205,"startTime":1630936774000,"transportNo":"","transportType":"2"},{"arriveCity":"cs","arriveTime":1630936774000,"companyId":1,"createDatetime":1630907974000,"createUserName":"哲盟用户","id":5445,"isdel":0,"oawbId":2942,"routeType":"3","shipId":1205,"startTime":1630936774000,"transportNo":"","transportType":"1"},{"arriveCity":"ws","arriveTime":1630936774000,"companyId":1,"createDatetime":1630907974000,"createUserName":"哲盟用户","id":5446,"isdel":0,"oawbId":2942,"routeType":"2","shipId":1205,"startTime":1630936774000,"transportNo":"","transportType":"2"}])
            }
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)['result_code'] == 0:
        return "创建总运单成功："+mawb
    return response.text

