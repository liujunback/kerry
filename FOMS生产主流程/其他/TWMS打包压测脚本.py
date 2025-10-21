import datetime
import json
import re
import redis
import requests
import openpyxl
import random
from locust import HttpUser, TaskSet, task


class PackOrderTest(TaskSet):
    """打包订单测试任务集"""

    def __init__(self, parent):
        super().__init__(parent)
        # 连接Redis
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        self.wms_token = None
        # 加载Excel中的wave_number数据
        self.wave_numbers = self.load_wave_numbers_from_excel()
        # 当前使用的wave_number索引
        self.current_wave_index = 0

    def load_wave_numbers_from_excel(self):
        """从Excel文件加载wave_number数据"""
        try:
            # 请根据实际情况修改Excel文件路径
            workbook = openpyxl.load_workbook('wave_numbers.xlsx')
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
            # 返回一些默认值，以防Excel读取失败
            return ["WAVE_DEFAULT_001", "WAVE_DEFAULT_002", "WAVE_DEFAULT_003"]

    def get_next_wave_number(self):
        """获取下一个wave_number，循环使用"""
        if not self.wave_numbers:
            return "WAVE_DEFAULT"

        wave_number = self.wave_numbers[self.current_wave_index]
        self.current_wave_index = (self.current_wave_index + 1) % len(self.wave_numbers)
        return wave_number

    def on_start(self):
        """登录WMS系统"""
        self.wms_login()

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
        """订单打包"""
        if not self.wms_token:
            print("WMS未登录，重新登录")
            self.wms_login()
            if not self.wms_token:
                return

        # 从Excel数据中获取wave_number
        wave_number = self.get_next_wave_number()
        print(f"使用wave_number: {wave_number}")

        # 打包操作
        sku_number = "TRFOMS2025102003"
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
        with self.client.post(url,
                              data=payload,
                              headers=headers,
                              catch_response=True,
                              name="订单打包") as response:
            try:
                response_data = json.loads(response.text)
                print(response.text)
                if response_data.get('status') == 0:
                    response.success()
                    print(f"打包成功，wave_number: {wave_number}")

                    # 从响应中获取tracking_number
                    try:
                        # 根据API响应结构获取tracking_number
                        new_tracking_number = response_data.get('shipment', {}).get('tracking_number')
                        if not new_tracking_number:
                            # 如果响应中没有tracking_number，生成一个随机跟踪号
                            print("响应中没有找到tracking_number，使用生成的跟踪号")
                        else:
                            # 将打包完成的订单信息存入Redis，供移交流程使用
                            packed_order_info = {
                                "tracking_number": new_tracking_number,  # 使用从响应获取的tracking_number
                                "packed_at": datetime.datetime.now().isoformat(),
                                "box_type": "QT1209",
                                "wave_number": wave_number  # 保存使用的wave_number，便于后续分析
                            }
                            self.redis_client.rpush("packed_orders", json.dumps(packed_order_info))
                            print(f"已打包wave {wave_number} 的跟踪号 {new_tracking_number} 已存入Redis队列")
                            print(f"从响应获取到tracking_number: {new_tracking_number}")
                    except Exception as e:
                        print(f"获取tracking_number失败: {e}")


                else:
                    response.failure(f"打包失败: {response.text}")
            except json.JSONDecodeError as e:
                response.failure(f"响应解析失败: {response.text}, 错误: {e}")
            except Exception as e:
                response.failure(f"处理响应时发生错误: {e}")


class PackOrderUser(HttpUser):
    """打包订单用户"""
    tasks = [PackOrderTest]
    host = "https://twms-th.kec-app.com"
    min_wait = 1000  # 单位为毫秒
    max_wait = 2000  # 单位为毫秒