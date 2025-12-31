import datetime
import random
import urllib

import requests
import hashlib
import json
import time
from urllib.parse import urlencode

from locust import HttpUser, between

import urllib
import requests
import hashlib
import json
import time
import uuid
from urllib.parse import urlencode
from locust import HttpUser, task, between, TaskSet
import random

class RPDOpenAPI:
    def __init__(self, base_url, app_key, app_secret):
        self.base_url = base_url.rstrip('/')
        self.app_key = app_key
        self.app_secret = app_secret
        self.token = None
        self.session = requests.Session()

    def _generate_sign(self, params, body=None):
        # 严格过滤空值参数
        filtered = {k: v for k, v in params.items()
                    if v is not None and v != '' and k != 'sign'}

        # 按ASCII码排序（强制字节序列比较）
        sorted_params = sorted(filtered.items(),
                               key=lambda x: x[0].encode('utf-8'))

        # 拼接签名串
        sign_str = ''.join(f"{k}{v}" for k, v in sorted_params)
        if body:
            # 关键修正：对请求体进行URL编码
            sign_str += urllib.parse.quote_plus(body)

        # MD5计算（前后加secret）
        sign_str = self.app_secret + sign_str + self.app_secret
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()

    def login(self, username, password, company):
        """用户登录接口（获取token）"""
        login_params = {
            'method': 'open.api.user.login',
            'app_key': self.app_key,
            'sign_method': 'md5',
            'format': 'json',
            'version': '1.0',
            'timestamp': str(int(time.time() * 1000))
        }

        # 生成签名
        login_params['sign'] = self._generate_sign(login_params)

        # 发送请求
        url = f"{self.base_url}/cdmapi/router/rest?{urlencode(login_params)}"
        response = self.session.post(
            url,
            json={
                'userName': username,
                'password': password,
                'company': company
            },
            headers={'Content-Type': 'application/json'}
        )
        result = response.json()

        # 存储token
        if result.get('success') and 'user' in result:
            self.token = result['user'].get('token')
        print(self.token)
        return result



    # 使用示例
class OrderTestUser(HttpUser):
    """
    Locust压测用户类 - 专门测试下单接口
    """
    wait_time = between(1, 3)  # 用户等待时间1-3秒

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.api_client = None
        self.order_count = 0
        self.app_secret = ""
        self.app_key = "423302717",
        """每个虚拟用户启动时执行登录"""
        self.api_client = RPDOpenAPI(
            base_url=self.host or "http://geppetto-hk.com/",
            app_key="423302717",
            app_secret=""  # 需替换真实secret
        )

        # 登录获取token
        try:
            login_result = self.api_client.login(
                username="TEST922",
                password="C7DXB6",
                company="NEXX"
            )
            if login_result.get('success'):
                self.token = login_result['user'].get('token')
                self.order_count = 0
                print(f"用户登录成功，token: {self.api_client.token}")
            else:
                print(f"用户登录失败: {login_result}")
        except Exception as e:
            print(f"登录异常: {e}")

    def on_stop(self):
        """用户停止时执行"""
        print(f"用户停止，共下单: {self.order_count} 次")
    #
    # @task(1)  # 权重为1，表示每个用户循环执行这个任务
    # def create_asn_order(self):
    #     """单次订单测试"""
    #     # 测试下单
    #     cust_order_no ="TESTBACK"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,300))
    #     order_data = {
    #             "consignOrderConsignee": {
    #             "consigneeAddress1": "",
    #             "consigneeAddress2": "",
    #             "consigneeAddressAtreet": f"湖南省长沙市开福区{random.randint(1, 100)}号",
    #             "consigneeAreaId": "开福区",
    #             "consigneeCityId": "长沙市",
    #             "consigneeCompany": f"测试公司{random.randint(1000, 9999)}",
    #             "consigneeCountryId": "CN",
    #             "consigneeEmail": f"test{random.randint(1000, 9999)}@test.com",
    #             "consigneeFax": "",
    #             "consigneeHouseNo": f"S{random.randint(1000, 9999)}",
    #             "consigneeMobile": f"166{random.randint(10000000, 99999999)}",
    #             "consigneeName": f"测试收货人{random.randint(1000, 9999)}",
    #             "consigneePhone": f"166{random.randint(10000000, 99999999)}",
    #             "consigneePostcode": "410000",
    #             "consigneeProvinceId": "湖南省"
    #         },
    #         "consignOrderConsignor": {
    #             "consignorAddress1": "",
    #             "consignorAddress2": "",
    #             "consignorAddressAtreet": f"湖南省长沙市雨花区{random.randint(1, 100)}号",
    #             "consignorAreaId": "雨花区",
    #             "consignorCityId": "长沙市",
    #             "consignorCompany": f"测试发货公司{random.randint(1000, 9999)}",
    #             "consignorCountryId": "CN",
    #             "consignorEmail": f"sender{random.randint(1000, 9999)}@test.com",
    #             "consignorFax": "",
    #             "consignorHouseNo": f"L{random.randint(1000, 9999)}",
    #             "consignorMobile": f"166{random.randint(10000000, 99999999)}",
    #             "consignorName": f"测试发货人{random.randint(1000, 9999)}",
    #             "consignorPhone": f"166{random.randint(10000000, 99999999)}",
    #             "consignorPostcode": "410000",
    #             "consignorProvinceId": "湖南省"
    #         },
    #         "consignOrderDetail": [
    #             {
    #                 "caseNo": "TESTTR2025092202",
    #                 "consignOrderDetailExtra": {
    #                     "batchNo": f"BATCH{random.randint(1000, 9999)}",
    #                     "effectiveDate": "2025-12-31",
    #                     "memo": f"订单备注{random.randint(1, 100)}",
    #                     "productDate": "2025-01-01"
    #                 },
    #                 "palnQty": str(random.randint(1, 100)),
    #                 "productNo": "TESTTR2025092202"
    #             }
    #         ],
    #         "consignOrderLogistics": {
    #             "driverName": f"测试司机{random.randint(1000, 9999)}",
    #             "driverTel": f"166{random.randint(10000000, 99999999)}",
    #             "licensePlate": f"粤B{random.randint(1000, 9999)}",
    #             "logisticProduct": "ITTEST",
    #             "schemeCode": "ITTEST",
    #             "warehouseId": "TEST"
    #         },
    #         "custOrderNo": cust_order_no,
    #         "deliveryTime": "",
    #         "estArriveTime": "",
    #         "memo": f"订单{self.order_count}",
    #         "isAutoAudit": "1",
    #         "orderSource": "01",
    #         "orderType": "20"
    #     }
    #     if not self.token:
    #         raise RuntimeError("请先执行登录获取token")
    #
    #         # 公共参数
    #     common_params = {
    #         'method': 'oms.api.consign.order.addConsignOrder',
    #         'app_key': self.app_key,
    #         'sign_method': 'md5',
    #         'format': 'json',
    #         'version': '1.0',
    #         'timestamp': str(int(time.time() * 1000))
    #     }
    #     # print(common_params)
    #     # 生成紧凑型JSON并进行URL编码
    #     body_json = json.dumps(order_data, ensure_ascii=False)
    #
    #     # 生成签名（包含业务参数）
    #
    #     filtered = {k: v for k, v in common_params.items()
    #                 if v is not None and v != '' and k != 'sign'}
    #
    #     # 按ASCII码排序（强制字节序列比较）
    #     sorted_params = sorted(filtered.items(),
    #                            key=lambda x: x[0].encode('utf-8'))
    #     # 拼接签名串
    #     sign_str = ''.join(f"{k}{v}" for k, v in sorted_params)
    #     # MD5计算（前后加secret）
    #     sign_str = self.app_secret + sign_str + self.app_secret
    #     common_params['sign'] = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
    #     # 构建请求URL
    #     url = f"/omsapi/router/rest?{urlencode(common_params)}"
    #
    #     with self.client.post(url,
    #                     data=body_json,  # 使用data而不是json，确保body格式正确
    #                     headers={
    #                         'Content-Type': 'application/json',
    #                         'Authorization': f'Bearer {self.token}'
    #                     },
    #                     catch_response=True,
    #                     name="创建入库订单") as response:
    #         print(response.text)
    #         if response.status_code == 200:
    #             result = response.json()
    #             if result.get('success'):
    #                 response.success()
    #                 print(f"订单创建成功: {order_data['custOrderNo']}")
    #             else:
    #                 response.failure(f"业务失败: {result}")
    #                 print(f"订单失败: {result}")
    #         else:
    #             response.failure(f"HTTP错误: {response.status_code}")

    @task(1)  # 权重为1，表示每个用户循环执行这个任务
    def create_out_order(self):
        """单次订单测试"""
        # 测试下单
        cust_order_no ="TESTBACK"+ str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(random.randint(1,30000000))

        # 生成随机电话号码
        random_phone = f"1{random.randint(50, 89)}{random.randint(1000, 9999)}{random.randint(1000, 9999)}"

        # 生成随机人名
        surnames = ["张", "王", "李", "赵", "刘", "陈", "杨", "黄", "周", "吴"]
        names = ["明", "伟", "芳", "娜", "磊", "静", "强", "杰", "敏", "勇"]
        random_name = f"{random.choice(surnames)}{random.choice(names)}"


        # 返回完整的订单数据
        order_data ={
            "isDeduction": "0",
            "orderConsignee": {
                "consigneeAddressStreet": f"汇恒{random.randint(1, 5)}期{random.randint(100, 999)}",
                "consigneeAreaName": random.choice(["南山区", "福田区", "罗湖区", "宝安区", "龙岗区"]),
                "consigneeCityName": "深圳市",
                "consigneeCountryId": "CN",
                "consigneeName": random_name,
                "consigneePhone": random_phone,
                "consigneePostcode": "518000",
                "consigneeProvinceName": "广东省",
                "consigneeHouseNo": f"S{random.randint(1000, 9999)}"  # 参数化的门牌号
            },
            "custOrderNo": cust_order_no,
            "orderConsignor": {
                "consignorAddressStreet": f"西岸花园{random.randint(1, 10)}栋{random.randint(100, 999)}",
                "consignorAreaName": random.choice(["南山区", "福田区", "罗湖区", "宝安区", "龙岗区"]),
                "consignorCityName": "深圳市",
                "consignorCountryId": "CN",
                "consignorName": random_name,
                "consignorPhone": random_phone,
                "consignorProvinceName": "广东省",
                "consignorHouseNo": f"L{random.randint(1000, 9999)}"  # 参数化的门牌号
            },
            "orderLogistics": {
                "schemeCode": random.choice(["ZTZS"]),
                "warehouseId": random.choice(["TEST"]),
                "transportNo": f"{random.randint(1000000000000, 9999999999999)}",
                "enterPort": random.choice(["宝安", "蛇口", "盐田", "福田"]),
                "paintMarker": f"{random.randint(100, 999)}-{random.randint(10, 99)}A-{random.randint(1000, 9999)}"
            },
            "orderDetail": [{
                "palnQty": random.randint(1, 100),
                "productNo": "TESTTR2025092202"
            }],
            "shopId": f"ZLB{random.choice(['2C', '2B', '2D'])}P"
        }

        if not self.token:
            raise RuntimeError("请先执行登录获取token")

            # 公共参数
        common_params = {
            'method': 'oms.api.sale.order2c.addSaleOrder',
            'app_key': self.app_key,
            'sign_method': 'md5',
            'format': 'json',
            'version': '1.0',
            'timestamp': str(int(time.time() * 1000))
        }
        # print(common_params)
        # 生成紧凑型JSON并进行URL编码
        body_json = json.dumps(order_data, ensure_ascii=False)

        # 生成签名（包含业务参数）

        filtered = {k: v for k, v in common_params.items()
                    if v is not None and v != '' and k != 'sign'}

        # 按ASCII码排序（强制字节序列比较）
        sorted_params = sorted(filtered.items(),
                               key=lambda x: x[0].encode('utf-8'))
        # 拼接签名串
        sign_str = ''.join(f"{k}{v}" for k, v in sorted_params)
        # MD5计算（前后加secret）
        sign_str = self.app_secret + sign_str + self.app_secret
        common_params['sign'] = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
        # 构建请求URL
        url = f"/omsapi/router/rest?{urlencode(common_params)}"

        with self.client.post(url,
                        data=body_json,  # 使用data而不是json，确保body格式正确
                        headers={
                            'Content-Type': 'application/json',
                            'Authorization': f'Bearer {self.token}'
                        },
                        catch_response=True,
                        name="创建出库订单") as response:
            # print(response.text)
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    response.success()
                    print(f"出库订单创建成功: {order_data['custOrderNo']}")
                else:
                    print(json.dumps(order_data, ensure_ascii=False))
                    response.failure(f"业务失败: {result}")
                    print(f"订单失败: {result}")
            else:
                response.failure(response.text)
                # response.failure(f"HTTP错误: {response.status_code}")









