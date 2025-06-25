import datetime
import random

import requests
import json


def create_cargo():
    url = "http://120.24.31.239:20000/tms-saas-web/conso/cargo-precreate"
    cargo_no = "BACK"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))
    sc_pickup_tn = "ITTEST"+ str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(0,9999999))
    payload = json.dumps({
      "cargo_no": cargo_no,
      "sc_pickup_tn": sc_pickup_tn,
      "carrier_code": "343",
      "package": {
        "value": 10,
        "value_currency": "CNY",
        "actual_weight": 10,
        "estimate_re_countrycode": "TH"
      },
      "sender": {
        "name": "test",
        "address": "test",
        "city": "Shenzhen",
        "province": "test",
        "country_code": "CN",
        "post_code": "518001",
        "phone": "18618612345",
        "email": "jacky@ecommerce.com",
        "id_number": "1231231"
      },
      "items": [
        {
          "sku": "4573102554468",
          "description": "12123",
          "description_origin_language": "1231",
          "category": "123",
          "unit_price": 10,
          "currency": "CNY",
          "quantity": 1,
          "unit_weight": 104,
          "height": 5,
          "length": 10,
          "width": 25
        }
      ]
    })
    headers = {
      'Authorization': 'Bearer GBzCS7RcyG63wWRBkhFe65n6JFrCSSPZGF6jkhKnGkPYdMDBQNTeckQ4BTem5BfD',
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    if json.loads(response.text)["code"] ==201:
        print("创建集运成功：" + sc_pickup_tn)
        return {
            "cargo_no":cargo_no,
            "sc_pickup_tn":sc_pickup_tn
        }
    else:
        # print(reference_number)
        print(response.text)
        return "失败"
