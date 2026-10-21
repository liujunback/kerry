import uuid
import hashlib
import time
import json
import random
from locust import HttpUser, task, between

# ==================== 常量 ====================
CLIENT_KEY = "KEC_WMS_HK"
CLIENT_SECRET = "1fM=^wJGYX32L9tg"
BASE_URL = "https://stg-foms-api.kec-app.com"
URL_PATH = "/platform/anta/sku/create"

# 随机数据池
BRAND_CODES = ["1001", "1002", "1003", "1004", "1005"]
BRAND_NAMES = {
    "1001": "安踏大货",
    "1002": "安踏儿童",
    "1003": "FILA",
    "1004": "DESCENTE",
    "1005": "KOLON"
}
COLORS = ["Grey/White", "Black/Red", "Blue/Yellow", "Green/Black"]
SEASONS = ["Q1", "Q2", "Q3", "Q4"]
COUNTRIES = ["US", "CN", "JP", "KR", "GB"]
SIZE_KEYS = ["15", "16", "17", "18", "19"]


def random_sku():
    """随机 SKU，例如 AntaA1B2C3D4"""
    suffix = ''.join(random.choices('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=8))
    return f"Anta{suffix}"


def random_barcode(sku):
    """简单条码（13位数字）"""
    digits = ''.join(filter(str.isdigit, sku))
    if len(digits) < 13:
        digits = digits.ljust(13, '0')
    return digits[:13]


def random_art_no():
    """随机货号 8位"""
    return ''.join(random.choices('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=8))


class AntaSkuUser(HttpUser):
    host = BASE_URL
    wait_time = between(1, 3)

    @task
    def create_sku(self):
        # ----- 1. 随机生成数据 -----
        sku = random_sku()
        brand_code = random.choice(BRAND_CODES)
        brand_name = BRAND_NAMES[brand_code]
        barcode = random_barcode(sku)
        art_no = random_art_no()
        color = random.choice(COLORS)
        season = random.choice(SEASONS)
        country = random.choice(COUNTRIES)
        size_key = random.choice(SIZE_KEYS)

        # ----- 2. 构建 BODY 字典（结构与原脚本完全一致）-----
        body_dict = [
                {
                    "sku": sku,
                    "skuName": "Basketball Shoes",
                    "barcode": sku,
                    "brandCode": sku,
                    "brandName": brand_name,
                    "categoryCode": "10",
                    "categoryName": "鞋类",
                    "mclassCode": "ZX001",
                    "mclassName": "篮球鞋",
                    "sclassCode": "PX003",
                    "sclassName": "篮球鞋",
                    "color": color,
                    "englishName": "Basketball Shoes",
                    "grossWeight": round(random.uniform(0.3, 0.8), 2),
                    "netWeight": round(random.uniform(0.2, 0.7), 2),
                    "volume": round(random.uniform(0.5, 2.0), 2),
                    "year": "2024",
                    "season": season,
                    "artNo": art_no,
                    "sizeKey": size_key,
                    "countryCode": country,
                    "isRfid": random.choice([0, 1]),
                    "priceList": [
                        {"countryCode": "US", "currency": "USD", "amount": round(random.uniform(50.0, 200.0), 2)},
                        {"countryCode": "CN", "currency": "CNY", "amount": round(random.uniform(300.0, 1500.0), 2)}
                    ]
                }
            ]

        # ----- 3. 生成签名（与原脚本完全相同，但复用序列化结果）-----
        NONCE = str(uuid.uuid4()).replace('-', '').lower()
        TS = str(int(time.time() * 1000))

        # 关键：显式序列化，得到与 requests 发送时完全相同的字符串
        body_json = json.dumps(body_dict)   # 默认无额外空格

        raw_string = f"{CLIENT_KEY}|{CLIENT_SECRET}|{NONCE}|{TS}|{body_json}"
        SIG = hashlib.md5(raw_string.encode()).hexdigest()

        # ----- 4. 请求头 -----
        headers = {
            'Content-Type': 'application/json',
            'clientKey': CLIENT_KEY,
            'nonceStr': NONCE,
            'timestamp': TS,
            'signature': SIG
        }

        # ----- 5. 发送请求（使用 data=body_json，而不是 json=body_dict）-----
        with self.client.post(
            URL_PATH,
            data=body_json,          # 使用已序列化的字符串，确保与签名一致
            headers=headers,
            verify=False,
            proxies={"http": None, "https": None},
            catch_response=True
        ) as resp:
            if resp.status_code != 200:
                resp.failure(f"HTTP {resp.status_code}")
            else:
                try:
                    resp_json = resp.json()
                    if resp_json.get("success") is False:
                        resp.failure(f"业务失败: {resp_json.get('message')}")
                    else:
                        print(resp.text)
                except json.JSONDecodeError:
                    resp.failure("响应不是合法JSON")