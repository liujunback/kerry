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
        # 当前用户分配到的订单信息
        self.current_order = None
        # 初始化Redis数据（如果尚未初始化）
        self.initialize_orders_from_excel()

    def initialize_orders_from_excel(self):
        """从Excel文件初始化订单数据到Redis"""
        # 检查是否已经初始化
        if not self.redis_client.exists("pending_orders"):
            print("初始化订单数据到Redis...")
            orders = self.load_orders_from_excel()
            if orders:
                # 将订单数据存入Redis列表
                for order in orders:
                    order_data = {
                        "wave_number": order["wave_number"],
                        "barcode": order["barcode"]
                    }
                    self.redis_client.rpush("pending_orders", json.dumps(order_data))

                print(f"成功初始化 {len(orders)} 个订单到Redis")
            else:
                print("没有可用的订单数据")

    def load_orders_from_excel(self):
        """从Excel文件加载订单数据"""
        try:
            file_path = r'C:\Users\bliuj\Desktop\kerry\FOMS生产主流程\其他\wave_numbers.xlsx'
            workbook = openpyxl.load_workbook(file_path)
            sheet = workbook.active

            orders = []
            # 读取所有行（从第二行开始，第一行是标题）
            for row in range(2, sheet.max_row + 1):
                wave_number = sheet.cell(row=row, column=2).value  # B列是wave_number
                barcode = sheet.cell(row=row, column=3).value  # C列是barcode

                if wave_number and barcode:
                    orders.append({
                        "wave_number": str(wave_number),
                        "barcode": str(barcode)
                    })

            workbook.close()
            print(f"从Excel加载了 {len(orders)} 个订单")
            return orders
        except Exception as e:
            print(f"从Excel加载订单失败: {e}")
            return []

    def assign_order(self):
        """为当前用户分配一个订单"""
        # 从Redis获取一个待处理的订单
        order_json = self.redis_client.lpop("pending_orders")
        if not order_json:
            print("没有可用的订单")
            return None

        try:
            self.current_order = json.loads(order_json)
            print(
                f"用户分配到订单: wave_number={self.current_order['wave_number']}, barcode={self.current_order['barcode']}")
            return self.current_order
        except json.JSONDecodeError as e:
            print(f"解析订单数据失败: {e}")
            return None

    def on_start(self):
        """登录WMS系统并分配订单"""
        self.wms_login()
        # 分配订单
        order = self.assign_order()
        if not order:
            print("无法分配到订单，停止用户")
            raise StopUser()

    def wms_login(self):
        """WMS系统登录"""
        url = "https://qh-cn-twms.kec-app.com"
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
        if "dashboard" in login.text:
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
            print(login.text)

    @task(1)
    def pack_order(self):
        """订单打包 - 处理分配的订单"""
        # 如果没有分配到订单，尝试分配一个
        if not self.current_order:
            order = self.assign_order()
            if not order:
                print("没有可用的订单，停止用户")
                raise StopUser()
            # 分配成功，继续执行打包

        if not self.wms_token:
            print("WMS未登录，重新登录")
            self.wms_login()
            if not self.wms_token:
                return

        wave_number = self.current_order["wave_number"]
        barcode = self.current_order["barcode"]

        print(f"处理订单: wave_number={wave_number}, barcode={barcode}")

        # 打包操作
        url = "/opt/pack/ajax-pack-by-wave"
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-TOKEN': self.wms_token['csrf_token'],
            'Cookie': f"XSRF-TOKEN={self.wms_token['cookies']['XSRF-TOKEN']}; laravel_session={self.wms_token['cookies']['laravel_session']}"
        }

        payload = {
            "wave_number": wave_number,
            "barcode": barcode,
            "barcode_type": "default",
            "weight": 2,
            "box_type": "ITST-01",
            "type": "S",
            "serial_number": "",
            "skip_weight": "no",
            "forceSkipWeight": 1
        }

        sleep(random.randint(1, 5))

        with self.client.post(url,
                              data=payload,
                              headers=headers,
                              catch_response=True,
                              name="订单打包") as response:
            try:
                response_data = json.loads(response.text)
                if response_data.get('status') == 0:
                    response.success()

                    print(f"打包成功，wave_number: {wave_number}, barcode: {barcode}")

                    # 从响应中获取tracking_number
                    try:
                        new_tracking_number = response_data.get('shipment', {}).get('tracking_number')
                        if not new_tracking_number:
                            print("响应中没有找到tracking_number，使用生成的跟踪号")
                        else:
                            # 将打包完成的订单信息存入Redis的已完成列表
                            packed_order_info = {
                                "tracking_number": new_tracking_number,
                                "wave_number": wave_number,
                                "barcode": barcode,
                                "packed_at": datetime.datetime.now().isoformat(),
                                "box_type": "ITST-01"
                            }
                            self.redis_client.rpush("packed_orders", json.dumps(packed_order_info))
                            print(f"已打包订单，跟踪号 {new_tracking_number} 已存入Redis已完成列表")
                    except Exception as e:
                        print(f"获取tracking_number失败: {e}")

                    # 打包成功后，当前订单处理完成，设置为None以便获取下一个订单
                    self.current_order = None

                    # 尝试获取下一个订单
                    next_order = self.assign_order()
                    if not next_order:
                        print("所有订单处理完成，停止用户")
                        raise StopUser()

                else:
                    # 打包失败，将订单重新放回待处理队列
                    order_data = {
                        "wave_number": wave_number,
                        "barcode": barcode
                    }
                    self.redis_client.lpush("pending_orders", json.dumps(order_data))
                    print(f"打包失败，订单已重新放回队列: {order_data}")

                    response.failure(f"打包失败: {response.text}")

                    # 当前订单处理失败，设置为None以便获取下一个订单
                    self.current_order = None

            except json.JSONDecodeError as e:
                # 响应解析失败，将订单重新放回待处理队列
                order_data = {
                    "wave_number": wave_number,
                    "barcode": barcode
                }
                self.redis_client.lpush("pending_orders", json.dumps(order_data))
                print(f"响应解析失败，订单已重新放回队列: {order_data}")

                response.failure(f"响应解析失败: {response.text}, 错误: {e}")

                # 当前订单处理失败，设置为None以便获取下一个订单
                self.current_order = None

            except Exception as e:
                # 其他异常，将订单重新放回待处理队列
                order_data = {
                    "wave_number": wave_number,
                    "barcode": barcode
                }
                self.redis_client.lpush("pending_orders", json.dumps(order_data))
                print(f"处理订单时发生错误，订单已重新放回队列: {order_data}")

                response.failure(f"处理响应时发生错误: {e}")

                # 当前订单处理失败，设置为None以便获取下一个订单
                self.current_order = None


class PackOrderUser(HttpUser):
    """打包订单用户 - 每个用户从Redis获取订单进行打包，打包成功后删除订单"""
    tasks = [PackOrderTest]
    host = "https://qh-cn-twms.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒


def check_progress():
    """检查打包进度"""
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    # 获取待处理的订单数量
    pending_count = redis_client.llen("pending_orders")

    # 获取已打包的订单数量
    packed_count = redis_client.llen("packed_orders")

    print(f"\n=== 打包进度 ===")
    print(f"待处理订单数量: {pending_count}")
    print(f"已打包订单数量: {packed_count}")
    print(f"总进度: {packed_count}/{pending_count + packed_count}")
    print("===============\n")


def reset_orders():
    """重置订单数据（重新从Excel加载）"""
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

    # 删除Redis中的订单数据
    redis_client.delete("pending_orders")
    redis_client.delete("packed_orders")

    print("已重置订单数据，下次运行时会重新从Excel加载")


# 在运行Locust测试前，可以执行这个函数来检查进度
if __name__ == "__main__":
    # 检查进度
    check_progress()

    # 如果需要重置订单数据，取消下面的注释
    # reset_orders()