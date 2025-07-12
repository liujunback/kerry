import json

import datetime
import requests

from TMS.shopee_V2.jwt import jwt


def create_BOX():
    # url = "https://cb-tms.kec-app.com/tms-saas-web/shopee/api/services/ilh_shipment/create"
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/shopee/api/services/ilh_shipment/create"

    with open("../shopee_V2/box_data.txt", 'r',encoding= 'utf-8') as f:
        payload = json.loads(f.read())#转换成字典
        payload = {
              "data":payload,
              "data":payload,
              "data":payload,
              "timestamp": 1676447280
            }
        f.close()
    box_num  = "TWSPTEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))
    ilh_shopee_no = "BACKTEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))
    unique_id = "BACKTEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))
    payload["data"]["order"]["carrier_tn"] = box_num
    payload["data"]["order"]["carton_no"] = box_num
    payload["data"]["order"]["ilh_shopee_no"] = ilh_shopee_no
    payload["data"]["order"]["unique_id"] = unique_id
    parcel_list = []
    for i in range(3):
        parcel_list.append("TEST" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(i))
    payload["data"]["parcel_list"] = parcel_list
    payload = json.dumps(jwt(payload))

    headers = {
      'Content-Type': 'application/json'
    }
    print(payload)
    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["retcode"] != 1:
        print(box_num + response.text)
        print(json.loads(response.text)["data"]["carrier_tn"])
        # print(json.loads(response.text))
        return {"carrier_tn":box_num,
            "ilh_shopee_no":ilh_shopee_no,
            "unique_id":unique_id,
            "parcel_list":parcel_list}
    else:
        print(json.loads(response.text))

