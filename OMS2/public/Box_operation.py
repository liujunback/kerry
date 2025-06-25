import json

import requests

from TMS.public.Controller_Login import Controller_Login


ops_url = "http://47.107.105.241:22000"
token=Controller_Login()
headers = {
  'Authorization': token,
  'Content-Type': 'application/json'
}

class BOX_OPERATION:
    def big_id_inbound(big_id):
        import requests
        url = ops_url + "/controller/operations/inbound/box/boxInBound"
        payload={
                "operationType":"",
                "weights":"",
                "lengths":"",
                "widths":"",
                "heights":"",
                "boxType":"",
                "token":token,
                "inBoundBoxNumber":big_id,
                "operationTypeCode":[

                ]
            }

        response = requests.request("POST", url, headers = headers, data = json.dumps(payload))
        if json.loads(response.text)["code"] == 200:
            print(json.loads(response.text)["msg"])
        else:
            print(response.text)

    def big_id_outbound(big_id):
        import requests

        url = ops_url + "/controller/operations/inbound/box/boxOutBound"

        payload={
                    "boxNumber":big_id,
                    "boxType":"BAFYL",
                    "length":490,
                    "width":490,
                    "height":630,
                    "packWeights":1700
                }
        response = requests.request("POST", url, headers = headers, data = json.dumps(payload))
        if json.loads(response.text)["code"] == 200:
            print(json.loads(response.text)["msg"])
        else:
            print(response.text)

    def big_id_box_num(big_id):
        url = ops_url + "/controller/operations/package/findAllList"
        payload=  {
                        "dateType":0,
                        "customerName":"",
                        "endDate":"",
                        "beginDate":"",
                        "orderState":"",
                        "searchNum":"TESTBACK1102938850",
                        "searchState":"4",
                        "pageNum":1,
                        "pageSize":20,
                        "operationStatus":"",
                        "allocationCenter":"虎门分拨"
                    }
        response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
        if json.loads(response.text)["code"] == 200:
            return json.loads(response.text)["data"]["data"]["page"]["records"][0]["outboundBoxNo"]
        else:
            print(response.text)



    def big_id_check(big_id):
        url = ops_url + "/controller/operations/outbound/checkWeight"
        token = Controller_Login()
        payload={
                "boxTypeCode":"BAFYL",
                "boxNumber":big_id,
                "weighingWeight":str(2800),
                "length":490,
                "width":490,
                "height":630,
                "weight":1600
            }
        response = requests.request("POST", url, headers = headers, data = json.dumps(payload))
        if json.loads(response.text)["code"] == 200:
            print(json.loads(response.text)["msg"])
        else:
            print(response.text)