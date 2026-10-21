import datetime
import json

import requests

from HelloWorld.public.tms_login import login

def create_mawb():

    token = login()
    url = "http://120.24.31.239:20000/tms-saas-web/tms/oawb/add"
    mawb = "TESTBACK"+str(datetime.datetime.now().strftime('%Y%m%d%H%M%S'))
    payload={
            "oawbNo":mawb,
            "departureRouteId":"308",
            "nextStatId":"476",
            "remark":"",
            "startCity":"sz",
            "oawbState":"1",
            "outStatId":"1",
            "transportType":"1",
            "destIds":"",
            "destCode":"",
            "flipRuleId":"238",
            "tdWeig":"0.000",
            "token":token,
            "shipListStr":str([
                            {
                                "arriveCity":"gz",
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
                                "transportNo":"",
                                "transportType":"2",
                                "startTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
                            },
                            {
                                "arriveCity":"cs",
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
                                "transportNo":"",
                                "transportType":"1",
                                "startTime":str(datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z'))
                            },
                            {
                                "arriveCity":"ws",
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
                                "transportNo":"",
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
        print({"id":json.loads(response.text)["body"]["id"],
                "mawb":mawb})
        return {"id":json.loads(response.text)["body"]["id"],
                "mawb":mawb}
    else:
        print(response.text)