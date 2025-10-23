import datetime
import json
import re
import redis
import requests
from locust import HttpUser, TaskSet, task
from locust.exception import StopUser


class HandoverTest(TaskSet):
    """订单移交测试任务集"""

    def __init__(self, parent):
        super().__init__(parent)
        # 连接Redis
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.token = None
        # 记录连续没有订单的次数
        self.empty_count = 0
        # 最大允许的空检查次数
        self.max_empty_checks = 3

    def on_start(self):
        """登录WMS系统"""
        url = "https://twms-th.kec-app.com"
        username = "TEST-PY"
        password = "Tc123456789%"

        IP = url.split("//")[1]
        res1 = requests.get(url + '/opt/login')
        c_token = re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)[0]
        payload = {
            "username": username,
            "password": password,
            "_token": c_token
        }

        login = requests.post(url + '/opt/login', data=payload, cookies=res1.cookies)

        if "Logout" in login.text:
            print("登陆成功")
            XSRF_TOKEN = re.findall(r"XSRF-TOKEN=(.+?) for " + IP, str(login.cookies))[0]
            laravel_session = re.findall(r"laravel_session=(.+?) for " + IP, str(login.cookies))[0]
            csrf_token = re.findall(r"csrf-token\" content=\"(.+?)\">", str(login.text))[0]

            self.token = {
                "cookies": {
                    "XSRF-TOKEN": XSRF_TOKEN,
                    "laravel_session": laravel_session
                },
                "_token": c_token,
                "csrf_token": csrf_token
            }
        else:
            print("WMS登录失败")

    @task()
    def handover_order(self):
        """订单移交 - 没有订单时自动停止"""
        if not self.token:
            print("WMS未登录，重新登录")
            self.on_start()
            if not self.token:
                return

        # 从Redis获取已打包的tracking_number
        packed_order_json = self.redis_client.lpop("packed_orders")
        if not packed_order_json:
            self.empty_count += 1
            print(f"没有已打包的订单可移交 (第 {self.empty_count} 次检查)")

            # 如果连续多次没有订单，停止测试
            if self.empty_count >= self.max_empty_checks:
                print(f"连续 {self.max_empty_checks} 次没有找到可移交订单，停止用户")
                # 可以选择等待一段时间再检查，或者直接停止
                # 这里我们选择直接停止，因为打包流程可能已经结束
                raise StopUser()
            return

        # 重置空计数
        self.empty_count = 0

        try:
            packed_order = json.loads(packed_order_json)
            tracking_number = packed_order["tracking_number"]
            wave_number = packed_order.get("wave_number", "未知")
            print(f"开始移交订单，跟踪号: {tracking_number}, wave_number: {wave_number}")
        except (json.JSONDecodeError, KeyError) as e:
            print(f"解析打包订单信息失败: {e}")
            # 如果解析失败，将订单重新放回队列
            self.redis_client.rpush("packed_orders", packed_order_json)
            return

        # 移交操作
        url = "/opt/scan/handover-by-tracking-number"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-TOKEN': self.token['csrf_token'],
            'Cookie': f"XSRF-TOKEN={self.token['cookies']['XSRF-TOKEN']}; laravel_session={self.token['cookies']['laravel_session']}"
        }

        # 注意：这里使用表单格式，不是JSON
        payload = {
            "tracking_numbers[]": [tracking_number],
            "agent": "SELFPICK-PY",
            "actualLpCode": ""
        }

        with self.client.post(url,
                              data=payload,  # 使用表单格式，不是json.dumps
                              headers=headers,
                              catch_response=True,
                              name="订单移交") as response:
            try:
                response_data = json.loads(response.text)
                if response_data.get('code') == 200:
                    response.success()
                    print(f"订单移交成功，跟踪号: {tracking_number}")

                    # 将已移交的订单信息存入Redis，用于后续分析
                    handed_over_order = {
                        "tracking_number": tracking_number,
                        "handed_over_at": datetime.datetime.now().isoformat(),
                        "agent": "SELFPICK-PY",
                        "wave_number": wave_number
                    }
                    self.redis_client.rpush("handed_over_orders", json.dumps(handed_over_order))
                    print(f"已移交订单 {tracking_number} 已存入Redis队列")

                else:
                    response.failure(f"移交失败: {response.text}")
                    # 如果移交失败，将订单重新放回队列
                    self.redis_client.rpush("packed_orders", packed_order_json)
                    print(f"移交失败，已将订单 {tracking_number} 重新放回打包队列")
            except json.JSONDecodeError:
                response.failure(f"响应解析失败: {response.text}")
                # 如果解析失败，将订单重新放回队列
                self.redis_client.rpush("packed_orders", packed_order_json)
                print(f"响应解析失败，已将订单 {tracking_number} 重新放回打包队列")


class HandoverUser(HttpUser):
    """订单移交用户 - 没有订单时自动停止"""
    tasks = [HandoverTest]
    host = "https://twms-th.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒