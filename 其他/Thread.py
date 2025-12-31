import datetime
import random
import hashlib
import json
import time
import threading
from urllib.parse import urlencode
from locust import HttpUser, task, between


class OrderTestUser(HttpUser):
    """
    Locust压测用户类 - 整合入库和出库订单测试
    """
    wait_time = between(1, 3)

    # 共享token和锁
    _shared_token = None
    _token_lock = threading.Lock()
    _token_refresh_time = 0
    TOKEN_EXPIRE_TIME = 3600

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.order_count = 0
        self.app_secret = ""
        self.app_key = "423302717"
        self.token = None

    def _get_shared_token(self):
        """获取共享token"""
        current_time = time.time()

        if (self._shared_token and
                current_time - self._token_refresh_time < self.TOKEN_EXPIRE_TIME):
            return self._shared_token

        with self._token_lock:
            if (self._shared_token and
                    current_time - self._token_refresh_time < self.TOKEN_EXPIRE_TIME):
                return self._shared_token

            # 重新登录获取token
            try:
                token = self._login()
                if token:
                    self._shared_token = token
                    self._token_refresh_time = current_time
                    print(f"Token刷新成功: {token[:20]}...")
                    return token
                else:
                    print("Token获取失败")
                    return None
            except Exception as e:
                print(f"登录异常: {e}")
                return None

    def _login(self):
        """用户登录"""
        params = {
            'method': 'open.api.user.login',
            'app_key': self.app_key,
            'sign_method': 'md5',
            'format': 'json',
            'version': '1.0',
            'timestamp': str(int(time.time() * 1000))
        }

        params['sign'] = self._generate_sign(params)
        url = f"{self.host or 'http://geppetto-hk.com/'}/cdmapi/router/rest?{urlencode(params)}"

        response = self.client.post(
            url,
            json={'userName': "TEST922", 'password': "C7DXB6", 'company': "NEXX"},
            headers={'Content-Type': 'application/json'},
            name="用户登录"
        )

        result = response.json()
        return result['user']['token'] if result.get('success') and 'user' in result else None

    def _generate_sign(self, params, body=None):
        """生成签名"""
        filtered = {k: v for k, v in params.items() if v and k != 'sign'}
        sorted_params = sorted(filtered.items(), key=lambda x: x[0].encode('utf-8'))

        sign_str = ''.join(f"{k}{v}" for k, v in sorted_params)
        if body:
            sign_str += body

        sign_str = self.app_secret + sign_str + self.app_secret
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()

    def on_start(self):
        """用户启动时获取token"""
        self.token = self._get_shared_token()
        print(f"用户启动，token: {self.token[:20] if self.token else 'None'}...")

    def on_stop(self):
        """用户停止时执行"""
        print(f"用户停止，共下单: {self.order_count} 次")

    def _generate_common_params(self, method_name):
        """生成公共参数"""
        return {
            'method': method_name,
            'app_key': self.app_key,
            'sign_method': 'md5',
            'format': 'json',
            'version': '1.0',
            'timestamp': str(int(time.time() * 1000))
        }

    def _generate_random_phone(self):
        """生成随机手机号"""
        return f"1{random.randint(50, 89)}{random.randint(1000, 9999)}{random.randint(1000, 9999)}"

    def _generate_random_name(self):
        """生成随机姓名"""
        surnames = ["张", "王", "李", "赵", "刘", "陈", "杨", "黄", "周", "吴"]
        names = ["明", "伟", "芳", "娜", "磊", "静", "强", "杰", "敏", "勇"]
        return f"{random.choice(surnames)}{random.choice(names)}"

    def _send_order_request(self, order_data, method_name, order_type_name):
        """发送订单请求"""
        if not self.token:
            self.token = self._get_shared_token()
            if not self.token:
                raise RuntimeError("无法获取有效token")

        common_params = self._generate_common_params(method_name)
        body_json = json.dumps(order_data, ensure_ascii=False, separators=(',', ':'))

        common_params['sign'] = self._generate_sign(common_params)
        url = f"/omsapi/router/rest?{urlencode(common_params)}"

        with self.client.post(url,
                              data=body_json,
                              headers={
                                  'Content-Type': 'application/json',
                                  'Authorization': f'Bearer {self.token}'
                              },
                              catch_response=True,
                              name=order_type_name) as response:

            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    response.success()
                    self.order_count += 1
                    print(f"{order_type_name}成功: {order_data['custOrderNo']}")
                else:
                    if any(keyword in str(result).lower() for keyword in ['token', 'auth']):
                        print("Token可能过期，尝试刷新")
                        self.token = None
                        self.token = self._get_shared_token()
                    response.failure(f"业务失败: {result}")
            else:
                print(response.json())
                response.failure(f"HTTP错误: {response.text}")

    @task(3)
    def create_out_order(self):
        """创建出库订单"""
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        cust_order_no = f"TESTBACK{timestamp}{random.randint(1, 30000000)}"

        order_data = {
            "isDeduction": "0",
            "custOrderNo": cust_order_no,
            "orderConsignee": {
                "consigneeAddressStreet": f"汇恒{random.randint(1, 5)}期{random.randint(100, 999)}",
                "consigneeAreaName": random.choice(["南山区", "福田区", "罗湖区", "宝安区", "龙岗区"]),
                "consigneeCityName": "深圳市",
                "consigneeCountryId": "CN",
                "consigneeName": self._generate_random_name(),
                "consigneePhone": self._generate_random_phone(),
                "consigneePostcode": "518000",
                "consigneeProvinceName": "广东省",
                "consigneeHouseNo": f"S{random.randint(1000, 9999)}"
            },
            "orderConsignor": {
                "consignorAddressStreet": f"西岸花园{random.randint(1, 10)}栋{random.randint(100, 999)}",
                "consignorAreaName": random.choice(["南山区", "福田区", "罗湖区", "宝安区", "龙岗区"]),
                "consignorCityName": "深圳市",
                "consignorCountryId": "CN",
                "consignorName": self._generate_random_name(),
                "consignorPhone": self._generate_random_phone(),
                "consignorProvinceName": "广东省",
                "consignorHouseNo": f"L{random.randint(1000, 9999)}"
            },
            "orderLogistics": {
                "schemeCode": "ZTZS",
                "warehouseId": "TEST",
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

        self._send_order_request(order_data, "oms.api.sale.order2c.addSaleOrder", "创建出库订单")

    # @task(1)
    # def create_asn_order(self):
    #     """创建入库订单"""
    #     timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    #     cust_order_no = f"TESTASN{timestamp}{random.randint(1, 300)}"
    #
    #     order_data = {
    #         "custOrderNo": cust_order_no,
    #         "isAutoAudit": "1",
    #         "orderSource": "01",
    #         "orderType": "20",
    #         "memo": f"订单{self.order_count}",
    #         "consignOrderConsignee": {
    #             "consigneeAddressAtreet": f"湖南省长沙市开福区{random.randint(1, 100)}号",
    #             "consigneeAreaId": "开福区",
    #             "consigneeCityId": "长沙市",
    #             "consigneeCompany": f"测试公司{random.randint(1000, 9999)}",
    #             "consigneeCountryId": "CN",
    #             "consigneeEmail": f"test{random.randint(1000, 9999)}@test.com",
    #             "consigneeHouseNo": f"S{random.randint(1000, 9999)}",
    #             "consigneeMobile": self._generate_random_phone(),
    #             "consigneeName": self._generate_random_name(),
    #             "consigneePhone": self._generate_random_phone(),
    #             "consigneePostcode": "410000",
    #             "consigneeProvinceId": "湖南省"
    #         },
    #         "consignOrderConsignor": {
    #             "consignorAddressAtreet": f"湖南省长沙市雨花区{random.randint(1, 100)}号",
    #             "consignorAreaId": "雨花区",
    #             "consignorCityId": "长沙市",
    #             "consignorCompany": f"测试发货公司{random.randint(1000, 9999)}",
    #             "consignorCountryId": "CN",
    #             "consignorEmail": f"sender{random.randint(1000, 9999)}@test.com",
    #             "consignorHouseNo": f"L{random.randint(1000, 9999)}",
    #             "consignorMobile": self._generate_random_phone(),
    #             "consignorName": self._generate_random_name(),
    #             "consignorPhone": self._generate_random_phone(),
    #             "consignorPostcode": "410000",
    #             "consignorProvinceId": "湖南省"
    #         },
    #         "consignOrderDetail": [{
    #             "caseNo": "TESTTR2025092202",
    #             "palnQty": str(random.randint(1, 100)),
    #             "productNo": "TESTTR2025092202",
    #             "consignOrderDetailExtra": {
    #                 "batchNo": f"BATCH{random.randint(1000, 9999)}",
    #                 "effectiveDate": "2025-12-31",
    #                 "memo": f"订单备注{random.randint(1, 100)}",
    #                 "productDate": "2025-01-01"
    #             }
    #         }],
    #         "consignOrderLogistics": {
    #             "driverName": f"测试司机{random.randint(1000, 9999)}",
    #             "driverTel": self._generate_random_phone(),
    #             "licensePlate": f"粤B{random.randint(1000, 9999)}",
    #             "logisticProduct": "ITTEST",
    #             "schemeCode": "ITTEST",
    #             "warehouseId": "TEST"
    #         }
    #     }
    #
    #     self._send_order_request(order_data, "oms.api.consign.order.addConsignOrder", "创建入库订单")