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
        token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjEzOCwidXNlck5hbWUiOiJiYWNrLmxpdSIsImlhdCI6MTczOTg0Njg5MywiZXhwIjoxNzQwNDUxNjkzfQ.YSzI_LrsVG_X_lztWwpz_A_EJtbq6DVjvlbNtavJ7Ck"
        self.token = token

    @task()
    def create_order(self):#下单

        # 定义请求头
        header = {
            'Content-Type':'application/json',
            "Authorization":"Bearer"+" "+self.token
            }
        param2 = {
                "warehouse_code": "FT",
                "merchant_code": "123",
                "logistics_provider": {
                    "code": "Floship"
                },
                "order_number": "TRFSCS2024012169359",
                "platform": {
                    "name": "12389tr"
                },
                "currency": "THB",
                "remarks": "YWEYIYUU998",
                "shipment_term": "DDP",
                "declared_value": "5000",
                "cod_value_currency": "THB",
                "require_customized_invoice": "0",
                "sender": {
                    "name": "test",
                    "company": "test shipper company",
                    "address": "test1 address",
                    "district": "-",
                    "city": "SZ",
                    "province": "GD",
                    "country_code": "CN",
                    "post_code": "21222",
                    "phone": "456789980",
                    "email": "123@abn.com"
                },
                "receiver": {
                    "name": "TEST TESTY",
                    "company": "test 32546",
                    "address": "test2 address",
                    "address1": "9888 test address2",
                    "district": "-",
                    "city": "San Francisco",
                    "province": "CO",
                    "country_code": "US",
                    "post_code": "80226",
                    "phone": "1234567891",
                    "email": "123@abn.com"
                },
                "items": [
                    {
                        "sku_code": "TESTTORI2023092601",
                        "description": "TEST009",
                        "unit_price": 2000,
                        "qty": 2,
                        "condition": "GOOD",
                        "weight": 1200
                    }
                ]
            }
        reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d')) + str(random.randint(1,99999999))

        param2['order_number']=reference_number
        with self.client.post('/api/foms/v2/order/create', data = json.dumps(param2), headers = header, name = "测试", catch_response = True) as response:
            if json.loads(response.text)["code"] == 202 or json.loads(response.text)["code"] == 201:
                response.success()
                print(json.loads(response.text))
            else:
                response.failure("fail")
                print(response.text)



class websitUser(HttpUser):
    tasks = [Test]
    host = "https://stg-foms-api.kec-app.com/"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒