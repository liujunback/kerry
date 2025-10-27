import random
import json
import time
from locust import HttpUser, task, between


class PackageOrderUser(HttpUser):
    host = "https://cb-tms-kp-de.kec-app.com"
    wait_time = between(1, 3)  # 等待时间1-3秒

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.token = "eyJ0-W1l#3RhbXAiOjE2NDg4Nzk0$zEw$DEsIm5vbmNlIjoiZHZTTUVV#TAiLCJ0b2tlbiI6Ijg0YzQzYjlkLWI3$jQtNGZk$C1hOTViLWU3NTFiNj#4ODA1YyJ9"

    def generate_order_data(self):
        """生成订单数据"""
        timestamp = int(time.time())
        random_suffix = random.randint(1000, 9999)
        order_id = f"ITTEST{timestamp}{random_suffix}"

        order_data = {
            "providerOrderId": order_id,
            "shippingInfo": {
                "lastName": "",
                "address": {
                    "address_l0": "ES",
                    "details": "Avinguda Meridiana 7 Piso 3 Puerto 1",
                    "address_l3": "Barcelona",
                    "address_l4": "",
                    "address_l1": "Catalonia",
                    "address_l2": "Barcelona"
                },
                "mobile": "(+34)695507118",
                "email": "Barcelona@qq.com",
                "postcode": "08018",
                "firstName": "Oriana Test",
                "phone": "(+34)695507118"
            },
            "timeZone": "UTC+0",
            "returnInfo": {
                "lastName": "",
                "address": {
                    "addressL0": "ES",
                    "addressL1": "Castilla La Mancha",
                    "addressL2": "Toledo",
                    "details": "Logistica 9 NAVE10 A-4,KM.64.500, 45300 Ocaña, Toledo",
                    "addressL3": "Ocana",
                    "addressL4": ""
                },
                "postcode": "45300",
                "mobile": "0034 813653618",
                "firstName": "ZHAO HUI",
                "phone": "0034 813653618"
            },
            "shippingMethodCode": "DXTTESXLR",
            "senderInfo": {
                "lastName": "TT",
                "email": "Carcelona@qq.com",
                "address": {
                    "address_l0": "China",
                    "details": "京东产业园区东区9号库一楼",
                    "address_l3": "Huadu",
                    "address_l4": "花东镇",
                    "address_l1": "Guangdong",
                    "address_l2": "Guangzhou"
                },
                "mobile": "18601776153",
                "postcode": "0",
                "firstName": "阴少朋",
                "phone": "18601776153"
            },
            "trackingNo": "-",
            "bigBagNo": "-",
            "value": {
                "goodsValue": "0",
                "codValue": "0",
                "isCod": 0,
                "currency": "EUR",
                "totalGoodsValue": "2.89"
            },
            "package_info": {
                "length": 23,
                "weight": 200,
                "volume": 1610,
                "width": 10,
                "height": 7
            },
            "items": [
                {
                    "unitPrice": "0",
                    "unitWeight": 364,
                    "productName": "Test Product",
                    "qty": 1,
                    "category": "601609",
                    "productUrl": "",
                    "skuId": "172238854798"
                }
            ],
            "returnType": 1
        }

        return order_data

    @task(1)
    def create_order(self):
        """创建包裹订单"""
        # 生成订单数据
        order_data = self.generate_order_data()

        # 准备请求头
        headers = {
            "token": self.token
        }

        # 准备表单数据
        data = {
            "param_json": json.dumps(order_data)
        }

        # 发送请求
        with self.client.post(
                "/tms-saas-web/logistics/provider/cross_border/package_order_create",
                data=data,
                headers=headers,
                catch_response=True,
                name="创建包裹订单"
        ) as response:
            # 根据响应判断成功/失败
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    if response_data.get("success") or response_data.get("code") == 0:
                        response.success()
                        print(order_data['providerOrderId'])
                        # print(f"订单创建成功: {order_data['providerOrderId']}")
                    else:
                        error_msg = response_data.get("msg", "未知错误")
                        response.failure(f"业务失败: {error_msg}")
                except:
                    response.failure("响应解析失败")
            else:
                response.failure(f"HTTP错误: {response.status_code}")