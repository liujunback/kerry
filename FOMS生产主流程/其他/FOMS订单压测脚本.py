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
        url = "https://foms-api.kec-app.com//auth/login"
        credentials = {"username": "back.back", "password": "123456.backT"}

        headers = {'Content-Type': 'application/json'}

        response = requests.post(url, json.dumps(credentials), headers=headers)
        # print(response.text)
        if response.status_code == 200:
            result = json.loads(response.text)
            self.token = result['token']
            print(f"FOMS登录成功，token: {self.token}")
        else:
            print(f"FOMS登录HTTP错误: {response.status_code}")

    @task(1)
    def create_order(self):
        """创建出库订单"""
        sku_number = "BACK_SKU20260910001"
        url = "/api/foms/v2/order/create"

        # 生成唯一订单号
        order_number = "back_Order" + datetime.datetime.now().strftime('%Y%m%d%H%M%S') + str(
            random.randint(1, 30000000))
        tracking_number = order_number  # 使用订单号作为跟踪号

        payload ={
                    "warehouse_code": "TIKTOK",
                    "merchant_code": "test2",
                    "logistics_provider": {
                        "code": "TIKTOK",#SELFPICK-PY
                        "require_customized_label": 1,
                        "tracking_number": tracking_number,
                        "label_url": "https://prod-foms-sg.s3-accelerate.amazonaws.com/FOMS-Label/TH252897962997D.pdf"
                    },
                    "order_number": order_number,
                    "order_type": "B2B",

                    "platform": {
                        "name": "12389tr",
                        "sale_platform_create_at": "2025-06-16T16:12:00+08:00"
                    },
                    "currency": "THB",
                    "shipment_term": "DDP",
                    "cod_value_currency": "THB",
                    "require_customized_invoice": "0",
                    "sender": {
                        "name": "test2",
                        "company": "test2 company",
                        "address": "test2 address",
                        "district": "-",
                        "city": "SZ",
                        "province": "GD",
                        "country_code": "CN",
                        "post_code": "21000",
                        "phone": "123456789",
                        "email": "123@abnc.com"
                    },
                    "receiver": {
                        "name": "test1-01",
                        "company": "test1-001 company",
                        "address": "test1 address",
                        "house_number": "5555",
                        "address1": "test1 address ASDHJ 787",
                        "district": "-",
                        "city": "SZ",
                        "province": "Vermont",
                        "country_code": "TH",
                        "post_code": "21000",
                        "phone": "123456789",
                        "email": "123@abnc.com",
                        "tax_id": "5686892114546",
                        "tax_id_type": "PASSPORT",
                        "taxid_issued_country_code":"CN"
                    },
                    "items": [
                        {
                            "sku_code": sku_number,
                            "description": "toritest",
                            "unit_price": 2000,
                            "qty": 1,
                            "weight": 1.23
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
            if response.status_code == 200 or response.status_code == 201 or response.status_code ==202 :
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
    host = "https://foms-api.kec-app.com/"
    # min_wait = 1000  # 单位为毫秒
    # max_wait = 2000  # 单位为毫秒