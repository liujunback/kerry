import uuid
import hashlib
import time
import requests
import json

# 定义常量
CLIENT_KEY = "KEC_WMS_HK"
CLIENT_SECRET = "1fM=^wJGYX32L9tg"
URL = "https://stg-foms-api.kec-app.com/platform/anta/sku/create"
BODY = [
        {
            "sku": "Anta1005",
            "skuName": "Basketball Shoes",
            "barcode": "84041991016017",
            "brandCode": "1001",
            "brandName": "安踏大货",
            "categoryCode": "10",
            "categoryName": "鞋类",
            "mclassCode": "ZX001",
            "mclassName": "篮球鞋",
            "sclassCode": "PX003",
            "sclassName": "篮球鞋",
            "color": "Grey/White",
            "englishName": "Basketball Shoes",
            "grossWeight": 0.01,
            "netWeight": 0.01,
            "volume": 0.01,
            "year": "2024",
            "season": "Q2",
            "artNo": "8124B1102S-6",
            "sizeKey": "15",
            "countryCode": "US",
            "isRfid": 0,
            "priceList": [
                {"countryCode": "US", "currency": "USD", "amount": 125.00},
                {"countryCode": "CN", "currency": "CNY", "amount": 899.00}
            ]
        }
    ]

# 生成nonce
NONCE = str(uuid.uuid4()).replace('-', '').lower()

# 生成时间戳（毫秒）
TS = str(int(time.time() * 1000))

# 计算签名
raw_string = f"{CLIENT_KEY}|{CLIENT_SECRET}|{NONCE}|{TS}|{json.dumps(BODY)}"
SIG = hashlib.md5(raw_string.encode()).hexdigest()

# 发送请求
headers = {
    'Content-Type': 'application/json',
    'clientKey': CLIENT_KEY,
    'nonceStr': NONCE,
    'timestamp': TS,
    'signature': SIG
}

response = requests.post(URL, json=BODY, headers=headers, verify=False, proxies={"http": None, "https": None})

# 打印响应
print("Status Code:", response.status_code)
print("Response Text:", response.text)
