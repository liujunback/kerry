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
                    "username":"20240815.back","password":"20240815.backD"
        }
        headers = {
          'Content-Type': 'application/json'
        }
        response = requests.post(url ,json.dumps(param2), headers = headers)
        if "200" in response.text:
            self.token =  json.loads(response.text)['data']['token']
        else:
            print(response.text)
        print(self.token)

    @task()
    def create_order(self):#下单

        url = "/api/foms/v2/order/create"
        order_number = "back_Order"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')+ str(random.randint(1,30000000)))

        platform_number = "back_Pla"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')+ str(random.randint(1,30000000)))

        payload={
                    "warehouse_code": "ITST",
                    "merchant_code": "KEC-2342",
                    "logistics_provider": {
                        "code": "KEC-234",
                        "tracking_number": order_number},
                    "order_number": order_number,
                    "platform": {

                    },
                    "currency": "THB",
                    "shipment_term": "DDU",
                    "cod_value_currency": "THB",
                    "declared_value": 1,
                    "require_customized_invoice": "0",
                    "remarks": "บิลออกในชื่อบริษัท40",
                    "self_pick_store1":"0070186601866",
                    "sender": {
                        "name": "test",
                        "company": "test company",
                        "address": "test address",
                        "district": "test12",
                        "city": "S1Z",
                        "province": "GD",
                        "country_code": "CN",
                        "post_code": "21001",
                        "phone": "123456789",
                        "email": "123@abnc.com"
                    },
                    "receiver": {
                        "name": "側是",
                        "company": "test company",
                        "address": "test sstest",
                        "district": "test",
                        "city": "SZ",
                        "province": "GD",
                        "country_code": "SG",
                        "post_code": "21000",
                        "phone": "223456789",
                        "email": "123@abnc.com"
                    },
                    "items": [
                        {
                            "sku_code": "BACK_SKU202509287351170",
                            "description": "backtest",
                            "unit_price": 167600,
                            "qty": 1,
                            "condition": "GOOD",
                            "weight": 6,
                            "properties": [
                                {
                                    "name": "5t234",
                                    "value": "32423"
                                }
                            ]
                        }
                    ]
                }

        with self.client.post(url,
                        data=json.dumps(payload),  # 使用data而不是json，确保body格式正确
                        headers={
                            'Content-Type': 'application/json',
                            'Authorization': f'Bearer {self.token}'
                        },
                        catch_response=True,
                        name="创建出库订单") as response:
            if json.loads(response.text)["code"]==202 or json.loads(response.text)["code"]==201:
                # print("创建Order成功")
                print("order_number：" + order_number)
                # print("Pla_number：" + platform_number)
            else:
                response.failure(f"业务失败: {response.text}")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://stg-foms-api.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒