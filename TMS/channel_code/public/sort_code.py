
import json

import requests
from TMS.channel_code.public.TMS_login import login


def add_sortcode(name,country,sortCode,hubOutId,hubInId):

    url = "https://tms-kec-eng-uat.kec-app.com//tms-saas-web/bas/sortcode/add"

    payload = {
            "custIds":"",
            "interceptInfo":"",
            "priority":"500",
            "sortCode":sortCode,
            "sortCodeName":name +"测试路线",
            "hubOutId":hubOutId,
            "hubInId":hubInId,
            "cargoType":"",
            "countryCode":country,
            "sortPartitionNames":[

            ],
            "declareType":"",
            "isIntercept":"0",
            "isusing":"1",
            "isReroute":"0",
            "isAsyncOrder":"0",
            "id":"",
            "packageLength":"0",
            "packageWide":"0",
            "packageHigh":"0",
            "token":login()
        }
    headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
    response = requests.request("POST", url = url, data = payload, headers = headers)
    print(response.text)
