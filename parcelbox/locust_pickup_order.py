from locust import HttpUser, task, between
from datetime import datetime
import threading
import os


class PickupOrderUser(HttpUser):
    host = "https://pudo-portal.parcelbox.net"
    wait_time = between(1, 3)

    # 类级别的计数器和锁
    _counter = 0
    _lock = threading.Lock()
    _initialized = False
    _counter_file = "pickup_order_counter.txt"

    @classmethod
    def _init_counter(cls):
        """从文件初始化计数器，避免重启后重复"""
        if cls._initialized:
            return
        if os.path.exists(cls._counter_file):
            try:
                with open(cls._counter_file, "r") as f:
                    cls._counter = int(f.read().strip())
            except (ValueError, IOError):
                cls._counter = 0
        cls._initialized = True

    @classmethod
    def _save_counter(cls):
        """保存计数器到文件"""
        with open(cls._counter_file, "w") as f:
            f.write(str(cls._counter))

    @classmethod
    def get_next_number(cls):
        """获取下一个递增编号"""
        with cls._lock:
            cls._init_counter()
            cls._counter += 1
            cls._save_counter()
            return cls._counter

    def generate_reference_number(self):
        """生成格式为 ITTEST + 日期 + 递增编号 的单号"""
        date_str = datetime.now().strftime("%Y%m%d")
        seq_num = self.get_next_number()
        return f"ITTEST{date_str}{seq_num:04d}"

    @task
    def create_pickup_order(self):
        """创建取件订单"""
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJjbWN0dzFwNnIwMDBvNzVreWhvbHJqb3d6IiwiY2xpZW50X2NvZGUiOiJMRU8tVUFULVBVRE8tT05MWSIsInR5cGUiOiJjbGllbnQiLCJpYXQiOjE3NzAzNzE4NjcsImV4cCI6MTc3MDQ1ODI2N30.M4Mji2e3xgzgeI6ICcxHF6OCa2YcefJ0qv4RLWy12iU"
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        }

        reference_number = self.generate_reference_number()

        payload = {
            "service": {
                "pudo_code": "ES504669",
                "auth_required": True,
                "auth_code": "23466"
            },
            "consignee": {
                "name": "Bob Consignee",
                "email": "back.j.liu@kln.com",
                "phone": "0987654321"
            },
            "package": {
                "weight": 1500,
                "vol_weight": 1500,
                "length": 16,
                "width": 15,
                "height": 17,
                "number_of_package": 1,
                "tracking_number": reference_number,
                "reference_number": reference_number
            },
            "request_id": reference_number
        }

        with self.client.post(
            "/api/v1/pickup-order",
            json=payload,
            headers=headers,
            catch_response=True
        ) as response:
            # 判断成功：HTTP 200/201 或响应体中 code=201 且 message=success
            if response.status_code in [200, 201]:
                try:
                    resp_json = response.json()
                    if resp_json.get("code") == 201 and resp_json.get("message") == "success":
                        response.success()
                    elif resp_json.get("code") == 200:
                        response.success()
                    else:
                        response.failure(f"Business error: {resp_json}")
                except Exception:
                    response.success()  # 无法解析JSON但HTTP状态码正确，视为成功
            else:
                print(reference_number)
                response.failure(f"HTTP {response.status_code}: {response.text}")
