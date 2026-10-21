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
        # url = "https://stg-foms-api.kec-app.com/user/login"
        url = "https://foms-api.kec-app.com//user/login"
        credentials = {"username": "backtest.backtest", "password": "123456.backT"}

        headers = {'Content-Type': 'application/json'}

        response = requests.post(url, json.dumps(credentials), headers=headers)
        # print(response.text)
        if response.status_code == 200:
            result = json.loads(response.text)
            if result.get("code") == 200:
                self.token = result['data']['token']
                print(f"FOMS登录成功，token: {self.token}")
            else:
                print(f"FOMS登录失败: {response.text}")
        else:
            print(f"FOMS登录HTTP错误: {response.status_code}")

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
                            "sku_code": "BACK_SKU20260910001",
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
                        catch_response=True, verify=False,
                        name="创建出库订单") as response:
            print(response.text)
            if json.loads(response.text)["code"]==202 or json.loads(response.text)["code"]==201:
                # print("创建Order成功")
                # pool = redis.ConnectionPool(host='localhost', port=6379, db = 3)
                # r = redis.Redis(connection_pool=pool)
                # r.set(order_num)
                print("order_number：" + order_number)
                # print("Pla_number：" + platform_number)
            else:
                response.failure(f"业务失败: {response.text}")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://foms.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒