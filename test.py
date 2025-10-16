import datetime
import random
import urllib
import requests
import hashlib
import json
import time
import threading
from urllib.parse import urlencode
from locust import HttpUser, task, between


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
            return self.token
        return None


class OrderTestUser(HttpUser):
    """
    Locust压测用户类 - 整合入库和出库订单测试
    """
    wait_time = between(1, 3)  # 用户等待时间1-3秒

    # 类变量 - 共享的token和锁
    _shared_token = None
    _token_lock = threading.Lock()
    _token_refresh_time = 0
    TOKEN_EXPIRE_TIME = 3600  # 假设token有效期为1小时

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.api_client = None
        self.order_count = 0
        self.app_secret = "YOUR_APP_SECRET"  # 替换为真实secret
        self.app_key = "423302717"

    def _get_shared_token(self):
        """获取共享token，如果不存在或已过期则重新登录"""
        current_time = time.time()

        # 检查token是否存在且未过期
        if (self._shared_token and
                current_time - self._token_refresh_time < self.TOKEN_EXPIRE_TIME):
            return self._shared_token

        # 使用锁确保只有一个线程执行登录
        with self._token_lock:
            # 再次检查，防止多个线程同时等待锁时重复登录
            if (self._shared_token and
                    current_time - self._token_refresh_time < self.TOKEN_EXPIRE_TIME):
                return self._shared_token

            # 需要重新登录
            self.api_client = RPDOpenAPI(
                base_url=self.host or "http://geppetto-hk.com/",
                app_key=self.app_key,
                app_secret=self.app_secret
            )

            try:
                token = self.api_client.login(
                    username="TEST922",
                    password="C7DXB6",
                    company="NEXX"
                )

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

    def on_start(self):
        """每个虚拟用户启动时获取共享token"""
        self.token = self._get_shared_token()
        if self.token:
            print(f"用户启动，使用共享token: {self.token[:20]}...")
        else:
            print("用户启动失败：无法获取token")

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
        """发送订单请求的通用方法"""
        if not self.token:
            # 尝试重新获取token
            self.token = self._get_shared_token()
            if not self.token:
                raise RuntimeError("无法获取有效token")

        # 公共参数
        common_params = self._generate_common_params(method_name)

        # 生成紧凑型JSON
        body_json = json.dumps(order_data, ensure_ascii=False, separators=(',', ':'))

        # 生成签名
        filtered = {k: v for k, v in common_params.items()
                    if v is not None and v != '' and k != 'sign'}

        sorted_params = sorted(filtered.items(),
                               key=lambda x: x[0].encode('utf-8'))

        sign_str = ''.join(f"{k}{v}" for k, v in sorted_params)
        sign_str = self.app_secret + sign_str + self.app_secret
        common_params['sign'] = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()

        # 构建请求URL
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
                    print(f"{order_type_name}创建成功: {order_data['custOrderNo']}")
                else:
                    # 如果是token过期，尝试刷新token
                    if "token" in str(result).lower() or "auth" in str(result).lower():
                        print(f"Token可能已过期，尝试刷新: {result}")
                        self.token = None  # 清除旧token
                        self.token = self._get_shared_token()  # 获取新token

                    response.failure(f"业务失败: {result.get('msg', '未知错误')}")
                    print(f"{order_type_name}失败: {result}")
            else:
                response.failure(f"HTTP错误: {response.status_code}")

    @task(3)  # 出库订单权重更高
    def create_out_order(self):
        """创建出库订单"""
        cust_order_no = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(
            random.randint(1, 30000000))

        order_data = {
            "isDeduction": "0",
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
            "custOrderNo": cust_order_no,
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

        self._send_order_request(order_data, "oms.api.sale.order2c.addSaleOrder", "创建出库订单")

    @task(1)  # 入库订单权重较低
    def create_asn_order(self):
        """创建入库订单"""
        cust_order_no = "TESTASN" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(
            random.randint(1, 300))

        order_data = {
            "consignOrderConsignee": {
                "consigneeAddress1": "",
                "consigneeAddress2": "",
                "consigneeAddressAtreet": f"湖南省长沙市开福区{random.randint(1, 100)}号",
                "consigneeAreaId": "开福区",
                "consigneeCityId": "长沙市",
                "consigneeCompany": f"测试公司{random.randint(1000, 9999)}",
                "consigneeCountryId": "CN",
                "consigneeEmail": f"test{random.randint(1000, 9999)}@test.com",
                "consigneeFax": "",
                "consigneeHouseNo": f"S{random.randint(1000, 9999)}",
                "consigneeMobile": self._generate_random_phone(),
                "consigneeName": self._generate_random_name(),
                "consigneePhone": self._generate_random_phone(),
                "consigneePostcode": "410000",
                "consigneeProvinceId": "湖南省"
            },
            "consignOrderConsignor": {
                "consignorAddress1": "",
                "consignorAddress2": "",
                "consignorAddressAtreet": f"湖南省长沙市雨花区{random.randint(1, 100)}号",
                "consignorAreaId": "雨花区",
                "consignorCityId": "长沙市",
                "consignorCompany": f"测试发货公司{random.randint(1000, 9999)}",
                "consignorCountryId": "CN",
                "consignorEmail": f"sender{random.randint(1000, 9999)}@test.com",
                "consignorFax": "",
                "consignorHouseNo": f"L{random.randint(1000, 9999)}",
                "consignorMobile": self._generate_random_phone(),
                "consignorName": self._generate_random_name(),
                "consignorPhone": self._generate_random_phone(),
                "consignorPostcode": "410000",
                "consignorProvinceId": "湖南省"
            },
            "consignOrderDetail": [
                {
                    "caseNo": "TESTTR2025092202",
                    "consignOrderDetailExtra": {
                        "batchNo": f"BATCH{random.randint(1000, 9999)}",
                        "effectiveDate": "2025-12-31",
                        "memo": f"订单备注{random.randint(1, 100)}",
                        "productDate": "2025-01-01"
                    },
                    "palnQty": str(random.randint(1, 100)),
                    "productNo": "TESTTR2025092202"
                }
            ],
            "consignOrderLogistics": {
                "driverName": f"测试司机{random.randint(1000, 9999)}",
                "driverTel": self._generate_random_phone(),
                "licensePlate": f"粤B{random.randint(1000, 9999)}",
                "logisticProduct": "ITTEST",
                "schemeCode": "ITTEST",
                "warehouseId": "TEST"
            },
            "custOrderNo": cust_order_no,
            "deliveryTime": "",
            "estArriveTime": "",
            "memo": f"订单{self.order_count}",
            "isAutoAudit": "1",
            "orderSource": "01",
            "orderType": "20"
        }

        self._send_order_request(order_data, "oms.api.consign.order.addConsignOrder", "创建入库订单")