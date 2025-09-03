import json

import requests

from TMS.shopee_V2.create_BOX import create_BOX
from TMS.shopee_V2.jwt import jwt


def create_order_shopee(carrier_tn,ilh_shopee_no,parcel_list):
    # url = "https://cb-tms.kec-app.com/tms-saas-web/shopee/api/services/ilh_shipment/push_info"
    url = "https://tms-kec-eng-uat.kec-app.com/tms-saas-web/shopee/api/services/ilh_shipment/push_info"
    parcel_list_data = []
    for i in range(len(parcel_list)):
        with open("../shopee_V2/order_data.txt", 'r',encoding= 'utf-8') as f:
            payload = json.loads(f.read())#转换成字典
            payload = {
                          "data": payload,
                          "timestamp": 1676448364
                        }
            f.close()
        payload["data"]["order"]["carrier_tn"] = carrier_tn
        payload["data"]["order"]["ilh_shopee_no"] = ilh_shopee_no
        data_list = payload["data"]["parcel_list"][0]
        data_list["domestic_third_party_no"] = parcel_list[i]
        data_list["reference_no"] = parcel_list[i]
        data_list["shopee_order_no"] = parcel_list[i]
        parcel_list_data.append(data_list)
    payload["data"]["parcel_list"] = parcel_list_data
    payload = json.dumps(jwt(payload))
    print(payload)
    headers = {
      'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["retcode"] != 1:
        print(parcel_list)
    else:
        print(response.text)
