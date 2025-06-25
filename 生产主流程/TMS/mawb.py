import datetime
import json
import random
import time

import requests


def create(token, properties):
    url = properties['tms_url']
    url = url + "/tms-saas-web/tms/oawb/add"
    with open("../../生产主流程/data/" + properties['order_txt'], 'r', encoding='utf-8') as f:
        param2 = json.loads(f.read())  # 转换成字典
        f.close()
    mawb = "TESTBACK" + str(datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    payload = {
        "oawbNo": mawb,
        "departureRouteId": int(properties['departure_Route_Id']),
        "nextStatId": int(properties['next_Stat_Id']),
        "remark": "",
        "startCity": "NNG",
        "oawbState": "1",
        "outStatId": "1",
        "transportType": "1",
        "exCustomsClearanceArea": "000",
        "destIds": "",
        "destCode": param2["receiver"]["country_code"],
        "oriCountry": param2["sender"]["country_code"],
        "destPortCountryCode": param2["receiver"]["country_code"],
        "flipRuleId": "238",
        "tdWeig": "0.000",
        "token": token,
        "shipListStr": str([
            {
                "arriveCity": "BKK",
                "arriveDay": "",
                "arriveTime": str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z')),
                "companyId": 1,
                "createDatetime": 1624427465000,
                "createUserName": "哲盟用户",
                "departureRouteId": 308,
                "id": 966,
                "isdel": 0,
                "routeType": "2",
                "shipId": int(properties['ship_Id']),
                "startDay": "",
                "transportNo": "213",
                "transportType": "2",
                "startTime": str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
            },
            {
                "arriveCity": "BKK",
                "arriveDay": "",
                "arriveTime": str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z')),
                "companyId": 1,
                "createDatetime": 1624427465000,
                "createUserName": "哲盟用户",
                "departureRouteId": 308,
                "id": 967,
                "isdel": 0,
                "routeType": "3",
                "shipId": int(properties['ship_Id']),
                "startDay": "",
                "transportNo": "213",
                "transportType": "1",
                "startTime": str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
            },
            {
                "arriveCity": "BKK",
                "arriveDay": "",
                "arriveTime": str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z')),
                "companyId": 1,
                "createDatetime": 1624427465000,
                "createUserName": "哲盟用户",
                "departureRouteId": 308,
                "id": 968,
                "isdel": 0,
                "routeType": "2",
                "shipId": int(properties['ship_Id']),
                "startDay": "",
                "transportNo": "213",
                "transportType": "2",
                "startTime": str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
            }
        ])
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload, verify=False)

    if json.loads(response.text)["body"]["id"]:
        print("创建总运单：" + mawb)
        print({
            "id": json.loads(response.text)["body"]["id"],
            "mawb": mawb})
        return {
            "id": json.loads(response.text)["body"]["id"],
            "mawb": mawb
        }
    else:
        print(response.text)


def select_BoxId(box_num, token, properties):
    url = properties['tms_url']
    url = url + "/tms-saas-web/tms/oawb/bagging/list"
    payload = {
        "codeType": "7",
        "code": box_num,
        "sdDateFirst": str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M')),
        "sdDateLast": str(datetime.datetime.now().strftime('%Y-%m-%d %H:%M')),
        "nextStatId": "",
        "baggingState": 3,
        "posStatId": 1,
        "dataType": 7,
        "pageSize": 500,
        "currentPage": 1,
        "token": token
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload, verify=False)
    if json.loads(response.text)["body"]["list"][0]:
        return json.loads(response.text)["body"]["list"][0]["id"]
    else:
        print(response.text)


def scan_box(box_num, mawb, mawb_id, token, properties):
    url = properties['tms_url']
    time.sleep(5)
    url = url + "/tms-saas-web/tms/oawb/selbagging/selectBagging"
    payload = {
        "id": mawb_id,
        "oawbNo": mawb,
        "baggingIdList": select_BoxId(box_num, token, properties),
        "scanStatId": "1",
        "baggingStatId": "1",
        "dataType": "7",
        "token": token
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload, verify=False)
    # print(response.text)
    if json.loads(response.text)["body"]["baggingIdList"]:
        print("扫描箱子成功：" + box_num)


# TH0121080500003M 2903  TESTBACK20210903134719

def close_mawb(mawb, mawb_id, token, properties):
    url = properties['tms_url']
    url = url + "/tms-saas-web/tms/oawbtrack/dtl/add"
    mawb = random.randint(1000000, 9999999)
    with open("../../生产主流程/data/" + properties['order_txt'], 'r', encoding='utf-8') as f:
        param2 = json.loads(f.read())  # 转换成字典
        f.close()
    payload = {
        "autoConfirm": 0,
        "departureRouteName": "测试11",
        "destCode": param2["receiver"]["country_code"],
        "flipRuleId": "238",
        "hubOutIdList": "",
        "id": mawb_id,
        "nextStation": "广州分部",
        "oawbNo": mawb,
        "outActual": 5.3,
        "exCustomsClearanceArea": "000",
        "outPcs": 0,
        "remark": "",
        "scanEr": 0,
        "scanSc": 0,
        "startCity": "sz",
        "tdActual": 11,
        "tdPcs": 10,
        "tdVol": 12,
        "tdWeig": 12,
        "totalActual": 3.6,
        "totalBagPcs": 1,
        "totalCount": "3",
        "totalPcs": "3",
        "transportType": "1",
        "mawbNo1": "193-" + str(mawb) + str(mawb % 7),
        "oawbState": 3,
        "token": token,
        "oawbShipStr": str([{"arriveCity": "gz", "arriveTime": 1630936774000, "companyId": 1,
                             "createDatetime": 1630907974000, "createUserName": "哲盟用户", "id": 5444, "isdel": 0,
                             "oawbId": 2942, "routeType": "2", "shipId": int(properties['ship_Id']),
                             "startTime": 1630936774000, "transportNo": "213", "transportType": "2"},
                            {"arriveCity": "cs", "arriveTime": 1630936774000, "companyId": 1,
                             "createDatetime": 1630907974000, "createUserName": "哲盟用户", "id": 5445, "isdel": 0,
                             "oawbId": 2942, "routeType": "3", "shipId": int(properties['ship_Id']),
                             "startTime": 1630936774000, "transportNo": "213", "transportType": "1"},
                            {"arriveCity": "ws", "arriveTime": 1630936774000, "companyId": 1,
                             "createDatetime": 1630907974000, "createUserName": "哲盟用户", "id": 5446, "isdel": 0,
                             "oawbId": 2942, "routeType": "2", "shipId": int(properties['ship_Id']),
                             "startTime": 1630936774000, "transportNo": "213", "transportType": "2"}])
    }
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    response = requests.request("POST", url, headers=headers, data=payload, verify=False)
    try:
        data = json.loads(response.text)
        if "message" in data and data["message"] == "请求成功":
            print("总运单确认成功：" + str(mawb))
        else:
            print("响应内容（可能不是请求成功）:", response.text)
    except json.decoder.JSONDecodeError:
        print("无法解析响应为JSON:", response.text)
    except Exception as e:
        print("发生错误:", e)
