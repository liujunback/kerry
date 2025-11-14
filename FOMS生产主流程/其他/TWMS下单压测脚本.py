import datetime
from locust import HttpUser, task, between
import random
import time
import json

import datetime
from locust import HttpUser, task, between
import random
import json


class OrderLoadTest(HttpUser):
    wait_time = between(1, 3)
    host = "https://stg-twms.kec-app.com"
    # host = "https://qh-cn-twms.kec-app.com"
    clients = [
        {
            "client_code": "QTST02",
            "skus": ["TRQHTS2025103104", "TRQHTS2025103105", "TRQHTS2025103106"]
        },
        # {
        #     "client_code": "QTST",
        #     "skus": ["TRQHTS2025103103", "TRQHTS2025103109", "TRQHTS2025103110","TRQHTS2025103111","TRQHTS2025103112","TRQHTS2025103113","TRQHTS2025103114","TRQHTS2025103115","TRQHTS2025103116","TRQHTS2025103117","TRQHTS2025103118","TRQHTS2025103119"]
        # },
        # {
        #     "client_code": "TEST-PY",
        #     "skus": ["TRFOMS2025101702"]
        # }
    ]

    def on_start(self):
        print("开始压测订单接口...")

    def generate_order_number(self, client_index):
        random_suffix = random.randint(1, 9999999)
        return f"IT{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}{client_index}{random_suffix}"

    def generate_random_items(self, client_skus):
        items = []
        num_items = random.randint(1, 3)
        selected_skus = random.sample(client_skus, min(num_items, len(client_skus)))
        total_declared_value = 0

        for sku in selected_skus:
            quantity = random.randint(1, 1)
            unit_price = 10
            total_item_value = unit_price * quantity

            item = {
                "sku": sku,
                "description": f"YUGundam Barbatos Lupus Model {sku[-4:]}",
                "category": random.choice(["shoe", "clothing", "electronics", "toy"]),
                "unit_price": unit_price,
                "currency": "HKD",
                "qty": quantity,
                "country_of_origin": random.choice(["US", "CN", "JP", "HK"]),
                "hs_code": f"68{random.randint(10000, 99999)}"
            }
            items.append(item)
            total_declared_value += total_item_value

        return items, total_declared_value

    @task(1)
    def create_order_with_variations(self):
        """创建出库订单"""
        client_index = random.randint(0, len(self.clients) - 1)
        client = self.clients[client_index]
        order_number = self.generate_order_number(client_index)
        items, total_declared_value = self.generate_random_items(client["skus"])
        total_weight = 200 + (len(items) * 100)

        order_data = {
            "centre_code": "QT",
            "client_code": client["client_code"],
            "real_time_response": False,
            "created_at": "2025-06-25",
            "trade_mode": "B2B2C",
            "order_brand": "TEST617",
            "order_type": "B2B",
            "sale_platform_create_at": "2025-06-25 09:00:07",
            "foms_create_at": "2025-06-25 09:00:07",
            "logistics_provider": {
                "code": "SELFPICK"
            },
            "package": {
                "order_number": order_number,
                "platform_order_id": f"{order_number}-01",
                "declared_value": total_declared_value,
                "declared_value_currency": "HKD",
                "height": 50,
                "length": 10,
                "width": 25,
                "is_block": "",
                "actual_weight": total_weight,
                "shipment_term": "DDP",
                "payment_method": "PP",
                "remarks": f"LOAD TEST - {len(items)} items"
            },
            "sender": {
                "name": "IT Support Team",
                "company": "TIMES-TEC",
                "address": "Hong Kong Xi Jiu Long A-001",
                "city": "Hong Kong",
                "province": "Hong Kong",
                "country_code": "HK",
                "post_code": "123456",
                "phone": "+85215811123456",
                "email": "Test@163.com",
                "district": "yutj"
            },
            "receiver": {
                "name": "JOEY TEST",
                "company": "JOEY CHAN",
                "address": "香港特别行政区油尖旺区尖沙咀金马伦道22-24号东丽中心",
                "city": "HK",
                "province": "NE",
                "country_code": "TH",
                "post_code": "21000",
                "phone": "7717698000",
                "email": "juan@gmail.com",
                "selfpick_store_1": "易碎",
                "district": "987yutj",
                "hs_code": "888888888888"
            },
            "items": items
        }

        with self.client.post(
                "/api/order",
                json=order_data,
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer lfXTsgZIvhoFR5gdhY4Tfd6Qspj1BObfAV736HAFhgspDWidLLQK0BweHdDq'#
                    # 'Authorization':"Bearer ZCZ3CnAxLhFhbGbZXITdHW8Mpk6dNlBTBmBTAA4tWpOd9JlB2gxcPj5fHw1y"
                },
                catch_response=True,
                name="CreateOrderVariation"
        ) as response:

            if response.status_code == 200:
                response.success()
                print(f"✓ 订单成功: {order_number} - 客户: {client['client_code']} - {len(items)}个商品  - {items[0]['sku']}")
            else:
                response.failure(f"HTTP {response.status_code}: {response.text}")
                print(f"✗ 订单失败: {order_number} - 状态码: {response.status_code}")

