import datetime
import json
import os
import re
from time import sleep

import redis
import requests
import openpyxl
import random
from locust import HttpUser, TaskSet, task
from locust.exception import StopUser


class PackOrderTest(TaskSet):
    """打包订单测试任务集"""

    def __init__(self, parent):
        super().__init__(parent)
        # 连接Redis
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.wms_token = None
        # 当前用户分配到的wave_number
        self.assigned_wave_number = None
        # 当前wave_number已打包次数
        self.pack_count = 0
        # 每个wave_number需要打包的次数
        self.packs_per_wave = 30
        # 初始化Redis数据（如果尚未初始化）
        self.initialize_wave_numbers()

    def initialize_wave_numbers(self):
        """初始化Redis中的wave_number数据"""
        # 检查是否已经初始化
        if not self.redis_client.exists("available_wave_numbers"):
            print("初始化wave_number数据到Redis...")
            wave_numbers = self.load_wave_numbers_from_excel()
            if wave_numbers:
                # 去重并打乱顺序
                unique_wave_numbers = list(set(wave_numbers))
                random.shuffle(unique_wave_numbers)

                # 将wave_number列表存入Redis
                for wave_number in unique_wave_numbers:
                    self.redis_client.rpush("available_wave_numbers", wave_number)
                    # 初始化打包计数器
                    self.redis_client.hset("wave_pack_count", wave_number, 0)

                print(f"成功初始化 {len(unique_wave_numbers)} 个唯一的wave_number到Redis")
            else:
                print("没有可用的wave_number数据")

    def load_wave_numbers_from_excel(self):
        """从Excel文件加载wave_number数据"""
        try:
            file_path = r'C:\Users\bliuj\Desktop\kerry\FOMS生产主流程\其他\wave_numbers.xlsx'
            workbook = openpyxl.load_workbook(file_path)
            sheet = workbook.active

            wave_numbers = []
            # 假设wave_number在第一列，从第二行开始（第一行可能是标题）
            for row in range(2, sheet.max_row + 1):
                wave_number = sheet.cell(row=row, column=1).value
                if wave_number:
                    wave_numbers.append(str(wave_number))

            workbook.close()
            print(f"从Excel加载了 {len(wave_numbers)} 个wave_number")
            return wave_numbers
        except Exception as e:
            print(f"从Excel加载wave_number失败: {e}")
            return []

    def assign_wave_number(self):
        """为当前用户分配一个wave_number"""
        # 从Redis获取可用的wave_number
        wave_number = self.redis_client.lpop("available_wave_numbers")
        if not wave_number:
            print("没有可用的wave_number")
            return None

        self.assigned_wave_number = wave_number
        # 从Redis获取当前wave_number的已打包次数
        current_count = self.redis_client.hget("wave_pack_count", wave_number)
        self.pack_count = int(current_count) if current_count else 0

        print(f"用户分配到wave_number: {self.assigned_wave_number}，已打包 {self.pack_count}/{self.packs_per_wave} 次")
        return self.assigned_wave_number

    def release_wave_number(self):
        """释放wave_number（当打包完成或用户停止时）"""
        if self.assigned_wave_number:
            # 如果打包次数未达到要求，将wave_number放回队列
            if self.pack_count < self.packs_per_wave:
                self.redis_client.rpush("available_wave_numbers", self.assigned_wave_number)
                print(
                    f"wave_number {self.assigned_wave_number} 放回队列，已打包 {self.pack_count}/{self.packs_per_wave} 次")
            else:
                print(f"wave_number {self.assigned_wave_number} 已完成 {self.packs_per_wave} 次打包")

            self.assigned_wave_number = None

    def on_start(self):
        """登录WMS系统并分配wave_number"""
        self.wms_login()
        # 分配wave_number
        wave_number = self.assign_wave_number()
        if not wave_number:
            print("无法分配到wave_number，停止用户")
            raise StopUser()

    def on_stop(self):
        """用户停止时释放wave_number"""
        self.release_wave_number()

    def wms_login(self):
        """WMS系统登录"""
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
            print("WMS登陆成功")
            XSRF_TOKEN = re.findall(r"XSRF-TOKEN=(.+?) for " + IP, str(login.cookies))[0]
            laravel_session = re.findall(r"laravel_session=(.+?) for " + IP, str(login.cookies))[0]
            csrf_token = re.findall(r"csrf-token\" content=\"(.+?)\">", str(login.text))[0]

            self.wms_token = {
                "cookies": {
                    "XSRF-TOKEN": XSRF_TOKEN,
                    "laravel_session": laravel_session
                },
                "_token": c_token,
                "csrf_token": csrf_token
            }
        else:
            print("WMS登录失败")

    @task(1)
    def pack_order(self):
        """订单打包 - 对分配的wave_number进行多次打包"""
        # 如果没有分配到wave_number，尝试分配一个
        if not self.assigned_wave_number:
            wave_number = self.assign_wave_number()
            if not wave_number:
                print("没有可用的wave_number，停止用户")
                raise StopUser()
            # 分配成功，继续执行打包

        # 检查是否已达到打包次数限制
        if self.pack_count >= self.packs_per_wave:
            print(
                f"wave_number {self.assigned_wave_number} 已完成 {self.packs_per_wave} 次打包，释放并获取新wave_number")
            self.release_wave_number()

            # 尝试获取新的wave_number
            wave_number = self.assign_wave_number()
            if not wave_number:
                print("没有可用的wave_number，停止用户")
                raise StopUser()
            # 成功获取新wave_number，继续打包
            print(f"已切换到新wave_number: {self.assigned_wave_number}")

        if not self.wms_token:
            print("WMS未登录，重新登录")
            self.wms_login()
            if not self.wms_token:
                return

        wave_number = self.assigned_wave_number

        print(f"对wave_number {wave_number} 进行第 {self.pack_count + 1}/{self.packs_per_wave} 次打包")

        # 打包操作
        sku_number = "TRFOMS2025101702"
        url = "/opt/pack/ajax-pack-by-wave"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-TOKEN': self.wms_token['csrf_token'],
            'Cookie': f"XSRF-TOKEN={self.wms_token['cookies']['XSRF-TOKEN']}; laravel_session={self.wms_token['cookies']['laravel_session']}"
        }

        payload = {
            "wave_number": wave_number,
            "barcode": sku_number,
            "barcode_type": "default",
            "weight": 2,
            "box_type": "ITST-01",
            "type": "S",
            "serial_number": "",
            "skip_weight": "no",
            "forceSkipWeight": 1
        }
        sleep(random.randint(1,5))
        with self.client.post(url,
                              data=payload,
                              headers=headers,
                              catch_response=True,
                              name="订单打包") as response:
            try:
                response_data = json.loads(response.text)
                if response_data.get('status') == 0:
                    response.success()

                    # 增加打包计数
                    self.pack_count += 1
                    # 更新Redis中的计数
                    self.redis_client.hset("wave_pack_count", wave_number, self.pack_count)

                    print(f"打包成功，wave_number: {wave_number}，第 {self.pack_count}/{self.packs_per_wave} 次")

                    # 从响应中获取tracking_number
                    try:
                        new_tracking_number = response_data.get('shipment', {}).get('tracking_number')
                        if not new_tracking_number:
                            print("响应中没有找到tracking_number，使用生成的跟踪号")
                        else:
                            # 将打包完成的订单信息存入Redis
                            packed_order_info = {
                                "tracking_number": new_tracking_number,
                                "packed_at": datetime.datetime.now().isoformat(),
                                "box_type": "QT1209",
                                "wave_number": wave_number,
                                "pack_count": self.pack_count
                            }
                            self.redis_client.rpush("packed_orders", json.dumps(packed_order_info))
                            print(
                                f"已打包wave {wave_number} 的第 {self.pack_count} 次，跟踪号 {new_tracking_number} 已存入Redis队列")
                    except Exception as e:
                        print(f"获取tracking_number失败: {e}")

                else:
                    response.failure(f"打包失败: {response.text}")
            except json.JSONDecodeError as e:
                response.failure(f"响应解析失败: {response.text}, 错误: {e}")
            except Exception as e:
                response.failure(f"处理响应时发生错误: {e}")


class PackOrderUser(HttpUser):
    """打包订单用户 - 每个用户对分配的wave_number打包30次，完成后自动切换下一个"""
    tasks = [PackOrderTest]
    host = "https://twms-th.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒


def check_progress():
    """检查打包进度"""
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    # 获取已打包的订单数量
    packed_count = redis_client.llen("packed_orders")

    # 获取剩余的wave_number数量
    remaining_waves = redis_client.llen("available_wave_numbers")

    # 获取所有wave_number的打包进度
    wave_counts = redis_client.hgetall("wave_pack_count")
    completed_waves = sum(1 for count in wave_counts.values() if int(count) >= 30)
    total_waves = len(wave_counts)

    print(f"\n=== 打包进度 ===")
    print(f"已打包订单数量: {packed_count}")
    print(f"剩余wave_number数量: {remaining_waves}")
    print(f"wave_number完成进度: {completed_waves}/{total_waves}")

    # 显示每个wave_number的详细进度
    print("详细进度:")
    for wave, count in wave_counts.items():
        print(f"  {wave}: {count}/30")
    print("===============\n")


# 在运行Locust测试前，可以执行这个函数来检查进度
if __name__ == "__main__":
    # 检查进度
    check_progress()