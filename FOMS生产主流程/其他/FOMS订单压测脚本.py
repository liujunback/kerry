import json
import random
import datetime
import redis
import requests
from locust import HttpUser, TaskSet, task


class CreateOrderTest(TaskSet):
    """创建订单测试任务集"""

    # def __init__(self, parent):
    #     super().__init__(parent)
    #     # 连接Redis
    #     self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    def on_start(self):
        """登录FOMS系统"""
        # url = "https://stg-foms-api.kec-app.com/user/login"
        url = "https://foms-api-lbs.kec-app.com/user/login"
        credentials = {
            "username": "tori.shopline",
            "password": "Gg1234567981%"
        }
        headers = {'Content-Type': 'application/json'}

        response = requests.post(url, json.dumps(credentials), headers=headers)
        if response.status_code == 200:
            result = json.loads(response.text)
            if result.get("code") == 200:
                self.token = result['data']['token']
                print(f"FOMS登录成功，token: {self.token}")
            else:
                print(f"FOMS登录失败: {response.text}")
        else:
            print(f"FOMS登录HTTP错误: {response.status_code}")

    @task(1)
    def create_order(self):
        """创建出库订单"""
        sku_number = "TRFOMS2025101702"
        url = "/api/foms/v2/order/create"

        # 生成唯一订单号
        order_number = "back_Order" + datetime.datetime.now().strftime('%Y%m%d%H%M%S') + str(
            random.randint(1, 30000000))
        tracking_number = order_number  # 使用订单号作为跟踪号

        payload = {
            "warehouse_code": "TEST-TH",
            "merchant_code": "KEC-2342",
            "logistics_provider": {
                "code": "SELFPICK-PY",
                "tracking_number": tracking_number
            },
            "order_number": order_number,
            "platform": {},
            "currency": "THB",
            "shipment_term": "DDU",
            "cod_value_currency": "THB",
            "declared_value": 1,
            "require_customized_invoice": "0",
            "remarks": "自动化测试订单",
            "self_pick_store1": "0070186601866",
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
                    "sku_code": sku_number,
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
                              data=json.dumps(payload),
                              headers={
                                  'Content-Type': 'application/json',
                                  'Authorization': f'Bearer {self.token}'
                              },
                              catch_response=True,
                              name="创建出库订单") as response:
            if response.status_code == 200 or response.status_code == 201:
                try:
                    response_data = json.loads(response.text)
                    if response_data.get("code") in [201, 202]:
                        response.success()
                        print(f"创建Order成功: {order_number}")

                        # 将订单号和跟踪号存入Redis，供后续流程使用
                        order_info = {
                            "order_number": order_number,
                            "tracking_number": tracking_number,
                            "created_at": datetime.datetime.now().isoformat()
                        }
                        # self.redis_client.rpush("pending_orders", json.dumps(order_info))
                        print(f"订单 {order_number} 已存入Redis队列")

                    else:
                        print(order_number)
                        response.failure(f"业务失败: {response.text}")
                except json.JSONDecodeError:
                    response.failure(f"响应解析失败: {response.text}")
            else:
                response.failure(f"HTTP请求失败: {response.status_code} - {response.text}")


class CreateOrderUser(HttpUser):
    """创建订单用户"""
    tasks = [CreateOrderTest]
    host = "https://foms-api-lbs.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒