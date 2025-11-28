import datetime
import json
import random
import time
import re
from time import sleep
import os

import redis
import requests
import openpyxl
from locust import HttpUser, TaskSet, task, between
from locust.exception import StopUser


class PackOrderTest(TaskSet):
    """打包订单测试任务集 - 每个线程处理一个波次"""

    def __init__(self, parent):
        super().__init__(parent)
        # Redis连接配置
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        self.wms_token = None
        self.current_wave = None  # 当前处理的波次
        self.current_barcodes = []  # 当前波次的所有条形码
        self.current_barcode_index = 0  # 当前处理的条形码索引
        self.max_retries = 3  # 最大重试次数
        self.retry_count = 0

        # 检查Redis连接
        self.check_redis_connection()

        # 初始化订单数据
        self.initialize_orders()

    def check_redis_connection(self):
        """检查Redis连接"""
        try:
            self.redis_client.ping()
            print("Redis连接成功")
        except redis.ConnectionError:
            print("Redis连接失败，请确保Redis服务正在运行")
            raise

    def initialize_orders(self):
        """初始化订单数据到Redis - 确保只执行一次"""
        try:
            # 使用Redis锁确保只有一个进程/用户执行初始化
            init_lock_key = "order_init_lock"
            init_done_key = "order_init_done"

            # 检查是否已经完成初始化
            if self.redis_client.exists(init_done_key):
                wave_count = self.redis_client.llen("wave_queue")
                print(f"订单数据已初始化，当前有 {wave_count} 个待处理波次")
                return

            # 尝试获取初始化锁
            lock_acquired = self.redis_client.setnx(init_lock_key, "1")
            if lock_acquired:
                # 设置锁过期时间，防止死锁
                self.redis_client.expire(init_lock_key, 30)

                # 再次检查，防止重复初始化
                if not self.redis_client.exists(init_done_key):
                    print("开始初始化订单数据到Redis...")
                    waves = self.load_barcodes_from_excel_by_wave()

                    if waves:
                        # 清空可能存在的旧数据
                        pipeline = self.redis_client.pipeline()

                        # 删除所有相关键
                        keys_to_delete = ["wave_queue", "packed_orders", "failed_orders", "completed_waves",
                                          "all_waves"]
                        for key in keys_to_delete:
                            pipeline.delete(key)

                        # 删除所有波次键
                        for wave_number in waves.keys():
                            pipeline.delete(f"wave:{wave_number}")

                        pipeline.execute()

                        # 重新存储数据
                        pipeline = self.redis_client.pipeline()

                        # 存储每个波次的条形码
                        total_barcodes = 0
                        for wave_number, barcodes in waves.items():
                            wave_key = f"wave:{wave_number}"
                            for barcode in barcodes:
                                pipeline.rpush(wave_key, barcode)
                            # 将波次添加到波次队列
                            pipeline.rpush("wave_queue", wave_number)
                            total_barcodes += len(barcodes)
                            print(f"波次 {wave_number}: {len(barcodes)} 个条形码")

                        # 存储所有波次的信息
                        pipeline.set("all_waves", json.dumps(list(waves.keys())))
                        # 标记初始化完成
                        pipeline.set(init_done_key, "1")
                        pipeline.execute()

                        print(f"成功初始化 {len(waves)} 个波次，共 {total_barcodes} 个条形码到Redis")
                    else:
                        print("警告: 没有可用的订单数据")
                else:
                    print("订单数据已被其他进程初始化")

                # 释放锁
                self.redis_client.delete(init_lock_key)
            else:
                # 等待其他进程完成初始化
                print("等待其他进程初始化订单数据...")
                for i in range(10):  # 最多等待10秒
                    if self.redis_client.exists(init_done_key):
                        wave_count = self.redis_client.llen("wave_queue")
                        print(f"订单数据初始化完成，当前有 {wave_count} 个待处理波次")
                        break
                    time.sleep(1)
                else:
                    print("初始化等待超时")

        except Exception as e:
            print(f"初始化订单数据失败: {e}")

    def validate_redis_data(self):
        """验证Redis中的数据是否正确"""
        try:
            # 获取所有波次
            all_waves_json = self.redis_client.get("all_waves")
            if not all_waves_json:
                print("没有波次数据")
                return False

            all_waves = json.loads(all_waves_json)
            print(f"Redis中总波次数: {len(all_waves)}")

            total_barcodes_in_redis = 0
            for wave_number in all_waves:
                wave_key = f"wave:{wave_number}"
                barcode_count = self.redis_client.llen(wave_key)
                total_barcodes_in_redis += barcode_count
                print(f"波次 {wave_number}: {barcode_count} 个条形码")

            print(f"Redis中总条形码数: {total_barcodes_in_redis}")

            # 从Excel重新加载验证
            excel_waves = self.load_barcodes_from_excel_by_wave()
            total_barcodes_in_excel = 0
            for wave_number, barcodes in excel_waves.items():
                total_barcodes_in_excel += len(barcodes)

            print(f"Excel中总条形码数: {total_barcodes_in_excel}")

            if total_barcodes_in_redis != total_barcodes_in_excel:
                print(f"数据不一致: Redis={total_barcodes_in_redis}, Excel={total_barcodes_in_excel}")
                return False

            print("数据验证通过")
            return True

        except Exception as e:
            print(f"数据验证失败: {e}")
            return False

    def load_barcodes_from_excel_by_wave(self):
        """从Excel文件加载条形码数据，按波次分组"""
        try:
            file_path = r'C:\Users\bliuj\Desktop\kerry\FOMS生产主流程\其他\wave_numbers.xlsx'

            workbook = openpyxl.load_workbook(file_path)
            sheet = workbook.active

            waves = {}
            # 读取所有行（从第二行开始，第一行是标题）
            for row in range(2, sheet.max_row + 1):
                wave_number = sheet.cell(row=row, column=2).value  # B列是wave_number
                barcode = sheet.cell(row=row, column=3).value  # C列是barcode

                if wave_number and barcode:
                    wave_number = str(wave_number)
                    if wave_number not in waves:
                        waves[wave_number] = []

                    waves[wave_number].append(str(barcode))

            workbook.close()
            print(f"从Excel加载了 {len(waves)} 个波次的条形码")
            return waves
        except Exception as e:
            print(f"从Excel加载条形码失败: {e}")
            return {}

    def get_next_wave(self):
        """从Redis获取下一个波次"""
        try:
            wave_number = self.redis_client.lpop("wave_queue")
            if wave_number:
                print(f"获取到波次: {wave_number}")
                return wave_number
            return None
        except redis.RedisError as e:
            print(f"获取波次失败: {e}")
            return None

    def get_barcodes_for_wave(self, wave_number):
        """获取指定波次的所有条形码"""
        try:
            wave_key = f"wave:{wave_number}"
            barcodes = self.redis_client.lrange(wave_key, 0, -1)
            print(f"波次 {wave_number} 有 {len(barcodes)} 个条形码")
            return barcodes
        except redis.RedisError as e:
            print(f"获取波次条形码失败: {e}")
            return []

    def return_wave_to_queue(self, wave_number):
        """将波次返回待处理队列"""
        try:
            self.redis_client.lpush("wave_queue", wave_number)
            print(f"波次已返回队列: {wave_number}")
        except redis.RedisError as e:
            print(f"返回波次到队列失败: {e}")

    def mark_barcode_completed(self, wave_number, barcode, tracking_number):
        """标记条形码为已完成并从Redis中移除"""
        try:
            packed_order_info = {
                "tracking_number": tracking_number,
                "wave_number": wave_number,
                "barcode": barcode,
                "packed_at": datetime.datetime.now().isoformat(),
                "box_type": "QT1209",
                "user_id": getattr(self.user, 'user_id', 'unknown')
            }

            # 1. 将完成的条形码添加到打包完成列表
            self.redis_client.rpush("packed_orders", json.dumps(packed_order_info))

            # 2. 从波次条形码列表中移除已处理的条形码
            wave_key = f"wave:{wave_number}"

            # 使用LREM命令从列表中移除指定的条形码
            removed_count = self.redis_client.lrem(wave_key, 1, barcode)

            if removed_count > 0:
                print(f"已从Redis移除条形码: {barcode}, 波次: {wave_number}")
            else:
                print(f"警告: 未能在Redis中找到条形码: {barcode}")

            print(f"条形码标记为完成: {barcode}, 波次: {wave_number}, 跟踪号: {tracking_number}")

        except redis.RedisError as e:
            print(f"标记条形码完成失败: {e}")

    def mark_wave_completed(self, wave_number):
        """标记波次为已完成"""
        try:
            self.redis_client.rpush("completed_waves", wave_number)
            print(f"波次标记为完成: {wave_number}")
        except redis.RedisError as e:
            print(f"标记波次完成失败: {e}")

    def on_start(self):
        """用户启动时执行"""
        print("用户启动，开始登录WMS系统...")

        # 验证数据
        if not self.validate_redis_data():
            print("数据验证失败，可能需要重新初始化")

        if self.wms_login():
            print("WMS登录成功")
            # 分配波次
            wave = self.get_next_wave()
            if wave:
                self.assign_wave(wave)
            else:
                print("无法分配到波次，停止用户")
                raise StopUser()
        else:
            print("WMS登录失败，停止用户")
            raise StopUser()

    def assign_wave(self, wave_number):
        """为当前用户分配一个波次"""
        self.current_wave = wave_number
        self.current_barcodes = self.get_barcodes_for_wave(wave_number)
        self.current_barcode_index = 0

        if not self.current_barcodes:
            print(f"波次 {wave_number} 没有条形码，尝试获取下一个波次")
            self.current_wave = None
            wave = self.get_next_wave()
            if wave:
                self.assign_wave(wave)
            else:
                print("没有可用的波次，停止用户")
                raise StopUser()
        else:
            print(f"用户分配到波次: {wave_number}, 包含 {len(self.current_barcodes)} 个条形码")

    def wms_login(self):
        """WMS系统登录"""
        try:
            url = self.user.host
            username = "TEST-PY"
            password = "Tc123456789%"

            IP = url.split("//")[1]
            res1 = requests.get(url + '/opt/login', timeout=10)
            c_token = re.findall(r"name=\"_token\" value=\"(.+?)\"", res1.text)

            if not c_token:
                print("无法获取登录token")
                return False

            c_token = c_token[0]

            payload = {
                "username": username,
                "password": password,
                "_token": c_token
            }

            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            login = requests.post(url + '/opt/login', data=payload,headers=headers, cookies=res1.cookies, timeout=10)
            # print(login.text)
            if "dashboard" in login.text:
                XSRF_TOKEN = re.findall(r"XSRF-TOKEN=(.+?) for " + IP, str(login.cookies))
                laravel_session = re.findall(r"laravel_session=(.+?) for " + IP, str(login.cookies))
                csrf_token = re.findall(r"csrf-token\" content=\"(.+?)\">", str(login.text))

                if not all([XSRF_TOKEN, laravel_session, csrf_token]):
                    print("获取token信息不完整")
                    return False

                self.wms_token = {
                    "cookies": {
                        "XSRF-TOKEN": XSRF_TOKEN[0],
                        "laravel_session": laravel_session[0]
                    },
                    "_token": c_token,
                    "csrf_token": csrf_token[0]
                }
                return True
            else:
                print("WMS登录失败")
                return False

        except requests.RequestException as e:
            print(f"登录请求失败: {e}")
            return False
        except Exception as e:
            print(f"登录过程发生错误: {e}")
            return False

    def ensure_wms_login(self):
        """确保WMS登录状态"""
        if not self.wms_token:
            print("WMS未登录，尝试重新登录...")
            return self.wms_login()
        return True

    def generate_tracking_number(self):
        """生成跟踪号"""
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        random_suffix = random.randint(1000, 9999)
        return f"TRK{timestamp}{random_suffix}"

    def get_current_barcode(self):
        """获取当前波次的下一个条形码"""
        if self.current_barcode_index < len(self.current_barcodes):
            barcode = self.current_barcodes[self.current_barcode_index]
            self.current_barcode_index += 1
            return barcode
        return None

    @task(1)
    def pack_order(self):
        """订单打包任务"""
        # 确保登录状态
        if not self.ensure_wms_login():
            print("无法登录WMS系统，停止用户")
            raise StopUser()

        # 如果没有分配到波次，尝试获取一个
        if not self.current_wave:
            wave = self.get_next_wave()
            if wave:
                self.assign_wave(wave)
            else:
                print("没有可用的波次，停止用户")
                raise StopUser()

        # 获取当前波次的下一个条形码
        barcode = self.get_current_barcode()
        if not barcode:
            # 当前波次的所有条形码已处理完成
            print(f"波次 {self.current_wave} 的所有条形码处理完成")
            self.mark_wave_completed(self.current_wave)

            # 获取下一个波次
            wave = self.get_next_wave()
            if wave:
                self.assign_wave(wave)
            else:
                print("所有波次处理完成，停止用户")
                raise StopUser()
            return

        wave_number = self.current_wave

        print(f"开始处理条形码: {barcode}, 波次: {wave_number}")

        # 准备请求数据
        payload = {
            "wave_number": wave_number,
            "barcode": barcode,
            "barcode_type": "default",
            "weight": 2,
            "box_type": "TEST01",
            "type": "S",
            "serial_number": "",
            "skip_weight": "no",
            "forceSkipWeight": 1
        }

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRF-TOKEN': self.wms_token['csrf_token'],
            'Cookie': f"XSRF-TOKEN={self.wms_token['cookies']['XSRF-TOKEN']}; laravel_session={self.wms_token['cookies']['laravel_session']}"
        }

        # 随机等待，模拟用户操作
        sleep_time = random.uniform(1, 3)
        sleep(sleep_time)

        # 发送打包请求
        with self.client.post(
                "/opt/pack/ajax-pack-by-wave",
                data=payload,
                headers=headers,
                catch_response=True,
                name="订单打包"
        ) as response:

            try:
                response_data = response.json()

                if response_data.get('status') == 0:
                    # 打包成功
                    response.success()
                    try:
                        new_tracking_number = response_data.get('shipment', {}).get('tracking_number')
                    except Exception as e:
                        print(f"获取tracking_number失败: {e}")
                    # 标记条形码完成
                    self.mark_barcode_completed(wave_number, barcode, new_tracking_number)
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
                    print(f"打包成功: 条形码 {barcode}, 波次 {wave_number}, 跟踪号 {new_tracking_number}")

                    # 重置重试计数
                    self.retry_count = 0

                else:
                    # 打包失败
                    error_msg = response_data.get('message', '未知错误')
                    response.failure(f"打包失败: {error_msg}")

                    self.retry_count += 1
                    print(
                        f"打包失败 (第{self.retry_count}次): 条形码 {barcode}, 波次 {wave_number}, 错误: {error_msg}")

                    if self.retry_count >= self.max_retries:
                        print(f"条形码 {barcode} 达到最大重试次数，放弃处理")
                        # 记录失败条形码并从Redis中移除
                        failed_barcode_info = {
                            "wave_number": wave_number,
                            "barcode": barcode,
                            "error": error_msg,
                            "failed_at": datetime.datetime.now().isoformat(),
                            "retry_count": self.retry_count
                        }
                        self.redis_client.rpush("failed_orders", json.dumps(failed_barcode_info))

                        # 从波次条形码列表中移除失败条形码
                        wave_key = f"wave:{wave_number}"
                        removed_count = self.redis_client.lrem(wave_key, 1, barcode)

                        if removed_count > 0:
                            print(f"已从Redis移除失败条形码: {barcode}")

                        self.retry_count = 0
                    else:
                        # 将失败的条形码重新放回当前波次的条形码列表末尾
                        self.current_barcodes.append(barcode)
                        print(f"条形码 {barcode} 已放回波次 {wave_number} 的末尾等待重试")
                        # 等待一段时间后重试
                        sleep(5)

            except json.JSONDecodeError:
                # 响应解析失败
                response.failure(response.text)
                # 将失败的条形码重新放回当前波次的条形码列表末尾
                self.current_barcodes.append(barcode)
                print(f"条形码 {barcode} 已放回波次 {wave_number} 的末尾等待重试")

            except Exception as e:
                # 其他异常
                response.failure(f"处理响应时发生错误: {e}")
                # 将失败的条形码重新放回当前波次的条形码列表末尾
                self.current_barcodes.append(barcode)
                print(f"条形码 {barcode} 已放回波次 {wave_number} 的末尾等待重试")


class PackOrderUser(HttpUser):
    """打包订单用户 - 每个用户处理一个波次的所有订单"""
    tasks = [PackOrderTest]
    host = "https://qh-cn-twms.kec-app.com"
    wait_time = between(1, 3)  # 使用between替代min_wait/max_wait

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # 为每个用户分配唯一ID
        self.user_id = f"user_{id(self)}"


def check_progress():
    """检查打包进度"""
    try:
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

        # 获取波次相关信息
        wave_count = redis_client.llen("wave_queue")
        completed_wave_count = redis_client.llen("completed_waves")

        # 获取所有波次列表
        all_waves_json = redis_client.get("all_waves")
        if all_waves_json:
            all_waves = json.loads(all_waves_json)
            total_wave_count = len(all_waves)
        else:
            total_wave_count = wave_count + completed_wave_count

        # 获取订单相关信息
        packed_count = redis_client.llen("packed_orders")
        failed_count = redis_client.llen("failed_orders")

        print(f"\n=== 打包进度报告 ===")
        print(f"总波次数量: {total_wave_count}")
        print(f"待处理波次: {wave_count}")
        print(f"已完成波次: {completed_wave_count}")
        print(f"已打包条形码: {packed_count}")
        print(f"失败条形码: {failed_count}")

        if total_wave_count > 0:
            progress = (completed_wave_count / total_wave_count) * 100
            print(f"波次完成进度: {progress:.2f}%")

        print("===================\n")

    except redis.RedisError as e:
        print(f"检查进度失败: {e}")


def reset_orders():
    """重置订单数据"""
    try:
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

        # 删除所有相关键
        keys_to_delete = [
            "wave_queue", "packed_orders", "failed_orders",
            "completed_waves", "all_waves", "order_init_done", "order_init_lock"
        ]

        # 获取所有波次键并删除
        all_waves_json = redis_client.get("all_waves")
        if all_waves_json:
            all_waves = json.loads(all_waves_json)
            for wave_number in all_waves:
                keys_to_delete.append(f"wave:{wave_number}")

        deleted_count = 0
        for key in keys_to_delete:
            if redis_client.exists(key):
                if key in ["wave_queue", "packed_orders", "failed_orders", "completed_waves"]:
                    count = redis_client.llen(key)
                else:
                    count = 1
                redis_client.delete(key)
                deleted_count += count
                print(f"已删除 {key}: {count} 条记录")

        print(f"总共删除 {deleted_count} 条记录")
        print("订单数据已重置，下次运行时会重新从Excel加载")

    except redis.RedisError as e:
        print(f"重置订单失败: {e}")


def show_wave_progress():
    """显示波次处理进度"""
    try:
        redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

        # 获取所有波次
        all_waves_json = redis_client.get("all_waves")
        if not all_waves_json:
            print("没有波次数据")
            return

        all_waves = json.loads(all_waves_json)
        pending_waves = redis_client.lrange("wave_queue", 0, -1)
        completed_waves = redis_client.lrange("completed_waves", 0, -1)

        print(f"\n=== 波次处理进度 ===")
        print(f"总波次: {len(all_waves)}")
        print(f"待处理: {len(pending_waves)}")
        print(f"已完成: {len(completed_waves)}")

        print("\n已完成波次:")
        for wave in completed_waves[:10]:  # 只显示前10个
            print(f"  - {wave}")
        if len(completed_waves) > 10:
            print(f"  ... 还有 {len(completed_waves) - 10} 个")

        print("\n待处理波次:")
        for wave in pending_waves[:10]:  # 只显示前10个
            print(f"  - {wave}")
        if len(pending_waves) > 10:
            print(f"  ... 还有 {len(pending_waves) - 10} 个")

        print("===================\n")

    except redis.RedisError as e:
        print(f"获取波次进度失败: {e}")


# 在运行Locust测试前，可以执行这个函数来检查进度
if __name__ == "__main__":
    print("打包订单测试工具")
    print("1. 检查进度")
    print("2. 重置订单数据")
    print("3. 显示波次进度")

    choice = input("请选择操作 (1/2/3): ").strip()

    if choice == "1":
        check_progress()
    elif choice == "2":
        reset_orders()
    elif choice == "3":
        show_wave_progress()
    else:
        print("无效选择")