import uuid
import hashlib
import time
import requests
import json

# 定义常量
CLIENT_KEY = "KEC_WMS_HK"
CLIENT_SECRET = "1fM=^wJGYX32L9tg"
URL = "https://stg-foms-api.kec-app.com/platform/anta/asn/create"

BODY = {"entryOrder":{"orderSource":"ztkj","entryOrderNo":"MXR60369716267190","outBizNo":"MXR60369716267190","whseId":"KEC_HK_CB_01","createTime":1774944172846,"orderType":"RETURN_EC","storerKey":"3L00","inventoryType":"T","stockLocation":"100006","totalSkuQty":1,"isRfid":0,"ecReturnOrder":{"ecOrderNo":"MXR60369716267190","expressNo":"MXR60369716267190","transactionNo":"","expressCompany":"","ecPlatform":"shopify"},"totalOrderLines":1,"orderLines":[{"orderLineNo":1,"sku":"112417718-7/8.5","planQty":1}]}}

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
