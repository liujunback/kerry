import ast
import json
import os
import random

import datetime
import openpyxl
import redis
import requests

from locust import HttpUser,TaskSet,task


class Test(TaskSet):

    def on_start(self):
        url = "https://stg-foms-api.kec-app.com/user/login"
        # url = "https://foms.kec-app.com/user/login"
        param2 = {
                    "username":"back.liu","password":"123456789"
        }
        headers = {
          'Content-Type': 'application/json'
        }
        response = requests.post(url ,data=json.dumps(param2), headers = headers)
        if "200" in response.text:
            self.token =  json.loads(response.text)['data']['token']
        else:
            print(response.text)
        print(self.token)

    @task()
    def create_order(self):#下单

        url = "/api/foms/v2/order/create"
        order_number = "back_Order"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))

        platform_number = "back_Pla"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S'))

        payload={
                    "warehouse_code":"ITST",
                    "merchant_code":"TORITEST",
                    "logistics_provider":{
                    "code":"KEC-TESTGX"
                    },
                    "order_number":order_number,
                    "platform":{

                    },
                    "currency":"THB",
                    "shipment_term":"DDP",
                    "cod_value_currency":"THB",
                    "require_carton_label":"1",
                    "carton_label_url":"",
                    "require_carton_photo":"1",
                    "require_customised_inovice":"1",
                    "sender":{
                    "name":"test",
                    "company":"",
                    "address":"test1 address",
                    "district":"-",
                    "city":"SZ",
                    "province":"GD",
                    "country_code":"CN",
                    "post_code":"21222",
                    "phone":"456789980",
                    "email":"123@abnc.com",
                    "tax_id":"344321",
                    "tax_id_type":"ID_CARD",
                    "taxid_issued_country_code":"CN"
                    },
                    "receiver":{
                    "name":"test_number",
                    "company":"",
                    "address":"test2 address",
                    "district":"-",
                    "city":"SZ",
                    "province":"PH",
                    "country_code":"TH",
                    "post_code":"21000",
                    "phone":"123456789",
                    "email":"123@abnc.com",
                    "tax_id":"409876",
                    "tax_id_type":"ID_CARD",
                    "taxid_issued_country_code":"TH"
                    },
                    "items":[
                    {
                        "sku_code":"TRSKU20240220003",
                        "description":"backtest",
                        "unit_price":982,
                        "qty":2,
                        "weight":12,
                        "require_product_label":"1",
                        "label_url":"",
                        "require_product_photo":"1"
                    }
                    ]
                    }
        headers = {
          'Authorization': 'Bearer ' + self.token,
          'Content-Type': 'application/json'
        }

        response = requests.post("POST", url, headers=headers, data=json.dumps(payload))
        if json.loads(response.text)["code"]==202:
            print("创建Order成功")
            print("order_number：" + order_number)
            print("Pla_number：" + platform_number)
        else:
            print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://stg-foms-api.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒