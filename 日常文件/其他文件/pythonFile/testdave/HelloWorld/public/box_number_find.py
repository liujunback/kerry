import json

import requests

from HelloWorld.public.ops_login import Ops_Login


def box_number_find(tracking_number):

    url = "http://59.36.186.173:22000/controller/operations/package/findAllList"
    token = Ops_Login()
    payload={
        "dateType":0,
        "customerName":"",
        "endDate":"",
        "beginDate":"",
        "orderState":"",
        "searchNum":tracking_number,
        "searchState":"5",
        "pageNum":1,"pageSize":20,
        "operationStatus":"",
        "allocationCenter":"虎门分拨"
    }
    headers = {
      'token': token,
      'Authorization': token,
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["data"]["data"]["totalOrderSize"] !=0:
        return json.loads(response.text)["data"]["data"]["page"]["records"][0]["outboundBoxNo"]
    else:
        print(response.text)
