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
URL_PATH = "/platform/anta/asn/create"

def generate_entry_order_no():
    """生成随机的 entryOrderNo，保持原格式前缀 MXR603 + 15位数字（原示例为 MXR603190003147）"""
    # 保留原前缀 MXR603，后面跟13位随机数字（总长16位，与示例类似）
    suffix = ''.join(random.choices('0123456789', k=13))
    return f"MXR603{suffix}"

class AntaAsnCreateUser(HttpUser):
    host = BASE_URL
    wait_time = between(1, 3)   # 可根据压测需求调整

    @task
    def create_asn(self):
        # ----- 1. 随机生成 entryOrderNo -----
        entry_order_no = generate_entry_order_no()
        # outBizNo 与 entryOrderNo 保持一致（按示例逻辑）
        out_biz_no = entry_order_no

        # ----- 2. 构建 BODY 字典（固定值 + 随机 entryOrderNo）-----
        body_dict = {
            "entryOrder": {
                "orderSource": "ztkj",
                "entryOrderNo": entry_order_no,
                "outBizNo": out_biz_no,
                "whseId": "KEC_HK_CB_01",
                "createTime": int(time.time() * 1000),   # 当前毫秒时间戳，动态生成
                "orderType": "RETURN_EC",
                "storerKey": "3L00",
                "inventoryType": "T",
                "stockLocation": "100006",
                "totalSkuQty": 1,
                "isRfid": 0,
                "ecReturnOrder": {
                    "ecOrderNo": entry_order_no,   # 按示例 ecOrderNo 与 entryOrderNo 相同
                    "expressNo": entry_order_no,
                    "transactionNo": "",
                    "expressCompany": "",
                    "ecPlatform": "shopify"
                },
                "totalOrderLines": 1,
                "orderLines": [
                    {
                        "orderLineNo": 1,
                        "sku": "112417718-7/8.5",
                        "planQty": 1
                    }
                ]
            }
        }

        # ----- 3. 生成签名（完全沿用原脚本方式）-----
        NONCE = str(uuid.uuid4()).replace('-', '').lower()
        TS = str(int(time.time() * 1000))

        # 显式序列化，确保签名与发送的字符串完全一致
        body_json = json.dumps(body_dict)   # 使用默认序列化（与原脚本相同）

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

        # ----- 5. 发送请求（使用 data=body_json，确保与签名一致）-----
        with self.client.post(
            URL_PATH,
            data=body_json,
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
                    # 根据实际接口返回判断成功/失败（示例中可能返回 success 字段）
                    if resp_json.get("success") is False:
                        resp.failure(f"业务失败: {resp_json.get('message')}")
                except json.JSONDecodeError:
                    resp.failure("响应不是合法JSON")

AntaAsnCreateUser.create_asn("1")
