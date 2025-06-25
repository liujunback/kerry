import datetime
import json
import random

import requests
import time
from TMS.public.TMS_Login import login



with open("../file_data/order_data.txt", 'r',encoding= 'utf-8') as f:
    param2 = json.loads(f.read())#转换成字典
    f.close()
def create():

    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawb/add"
    mawb = "TESTBACK"+str(datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    payload={
            "oawbNo":mawb,
            "departureRouteId":"308",
            "nextStatId":"476",
            "remark":"",
            "startCity":"NNG",
            "oawbState":"1",
            "outStatId":"1",
            "transportType":"1",
            "destIds":"",
            "destCode":param2["receiver"]["country_code"],
            "oriCountry":param2["sender"]["country_code"],
            "destPortCountryCode":param2["receiver"]["country_code"],
            "flipRuleId":"238",
            "tdWeig":"0.000",
            "token":token,
            "shipListStr":str([
                            {
                                "arriveCity":"KCH",
                                "arriveDay":"",
                                "arriveTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z')),
                                "companyId":1,
                                "createDatetime":1624427465000,
                                "createUserName":"哲盟用户",
                                "departureRouteId":308,
                                "id":966,
                                "isdel":0,
                                "routeType":"2",
                                "shipId":1205,
                                "startDay":"",
                                "transportNo":"213",
                                "transportType":"2",
                                "startTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
                            },
                            {
                                "arriveCity":"KCH",
                                "arriveDay":"",
                                "arriveTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z')),
                                "companyId":1,
                                "createDatetime":1624427465000,
                                "createUserName":"哲盟用户",
                                "departureRouteId":308,
                                "id":967,
                                "isdel":0,
                                "routeType":"3",
                                "shipId":1205,
                                "startDay":"",
                                "transportNo":"213",
                                "transportType":"1",
                                "startTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
                            },
                            {
                                "arriveCity":"KCH",
                                "arriveDay":"",
                                "arriveTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z')),
                                "companyId":1,
                                "createDatetime":1624427465000,
                                "createUserName":"哲盟用户",
                                "departureRouteId":308,
                                "id":968,
                                "isdel":0,
                                "routeType":"2",
                                "shipId":1205,
                                "startDay":"",
                                "transportNo":"213",
                                "transportType":"2",
                                "startTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
                            }
                        ])
            }
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload)

    if json.loads(response.text)["body"]["id"]:
        print("创建总运单："+mawb)
        return {"id":json.loads(response.text)["body"]["id"],
                "mawb":mawb}
    else:
        print(response.text)

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
    if json.loads(response.text)["body"]["list"][0]:
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
    if json.loads(response.text)["body"]["baggingIdList"]:
        print("扫描箱子成功："+box_num)

def close_mawb(mawb,mawb_id):
    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawbtrack/dtl/add"
    mawb = random.randint(1000000,9999999)
    mawb = "193-"+str(mawb)+str(mawb%7)
    payload = {
            "autoConfirm":0,
            "departureRouteName":"测试11",
            "destCode":param2["receiver"]["country_code"],
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
            "mawbNo1":mawb,
            "oawbState":3,
            "token":token,
            "oawbShipStr":str([{"arriveCity":"gz","arriveTime":1630936774000,"companyId":1,"createDatetime":1630907974000,"createUserName":"哲盟用户","id":5444,"isdel":0,"oawbId":2942,"routeType":"2","shipId":1205,"startTime":1630936774000,"transportNo":"213","transportType":"2"},{"arriveCity":"cs","arriveTime":1630936774000,"companyId":1,"createDatetime":1630907974000,"createUserName":"哲盟用户","id":5445,"isdel":0,"oawbId":2942,"routeType":"3","shipId":1205,"startTime":1630936774000,"transportNo":"213","transportType":"1"},{"arriveCity":"ws","arriveTime":1630936774000,"companyId":1,"createDatetime":1630907974000,"createUserName":"哲盟用户","id":5446,"isdel":0,"oawbId":2942,"routeType":"2","shipId":1205,"startTime":1630936774000,"transportNo":"213","transportType":"2"}])
            }
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["result_code"] == 0 :
        print("总运单发送成功:" + mawb)
    else:
        print(response.text)
