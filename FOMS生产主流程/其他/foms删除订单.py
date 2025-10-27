import pandas as pd
import requests
import json
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from openpyxl import load_workbook
import os


class OrderDeleter:
    def __init__(self, token, max_workers=10):
        self.token = token
        self.max_workers = max_workers
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        self.success_count = 0
        self.fail_count = 0
        self.lock = threading.Lock()  # 用于线程安全的计数器

    def delete_single_order(self, order_number):
        """删除单个订单"""
        payload = {"order_number": str(order_number).strip()}

        try:
            response = requests.post(
                'https://foms-api-lbs.kec-app.com/api/foms/v2/order/delete',
                headers=self.headers,
                json=payload,
                timeout=30
            )
            print(response.text)
            if response.status_code == 202:
                response_data = response.json()
                if response_data.get('code') == 202 or response_data.get('success') or response.status_code == 200:
                    with self.lock:
                        self.success_count += 1
                    print(f"✅ 删除成功: {order_number}")
                    return True, order_number
                else:
                    error_msg = response_data.get('message', '未知错误')
                    with self.lock:
                        self.fail_count += 1
                    print(f"❌ 删除失败: {order_number} - {error_msg}")
                    return False, order_number
            else:
                with self.lock:
                    self.fail_count += 1
                print(f"❌ HTTP错误 {response.status_code}: {order_number}")
                return False, order_number

        except Exception as e:
            with self.lock:
                self.fail_count += 1
            print(f"❌ 请求异常: {order_number} - {str(e)}")
            return False, order_number


def delete_orders_multithreaded(excel_file, token, max_workers=10):
    """多线程删除订单"""
    print("正在读取Excel文件...")

    try:
        # 读取Excel文件
        df = pd.read_excel(excel_file)
        print(f"成功读取Excel，共 {len(df)} 行数据")

        # 获取订单号列表
        order_numbers = []
        if 'order_number' in df.columns:
            order_numbers = df['order_number'].dropna().tolist()
        else:
            first_column = df.columns[0]
            order_numbers = df[first_column].dropna().tolist()

        print(f"找到 {len(order_numbers)} 个订单号")

        if not order_numbers:
            print("没有找到订单号")
            return

        # 创建订单删除器
        deleter = OrderDeleter(token, max_workers)

        print(f"开始多线程删除，线程数: {max_workers}")
        start_time = time.time()

        # 使用线程池执行删除任务
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            future_to_order = {
                executor.submit(deleter.delete_single_order, order_num): order_num
                for order_num in order_numbers
            }

            # 等待所有任务完成
            completed = 0
            for future in as_completed(future_to_order):
                order_num = future_to_order[future]
                try:
                    future.result()
                except Exception as exc:
                    print(f'订单 {order_num} 生成异常: {exc}')
                completed += 1
                if completed % 10 == 0:  # 每完成10个打印一次进度
                    print(f"进度: {completed}/{len(order_numbers)}")

        end_time = time.time()
        elapsed_time = end_time - start_time

        print(f"\n删除完成！")
        print(f"成功: {deleter.success_count}, 失败: {deleter.fail_count}")
        print(f"总耗时: {elapsed_time:.2f}秒")
        print(f"平均每秒处理: {len(order_numbers) / elapsed_time:.2f}个订单")

    except FileNotFoundError:
        print(f"错误: 找不到文件 {excel_file}")
    except Exception as e:
        print(f"处理Excel文件时发生错误: {e}")


def delete_orders_batch(excel_file, token, batch_size=50, delay=1):
    """批量删除订单（小批量+延迟，避免服务器压力过大）"""
    print("正在读取Excel文件...")

    try:
        df = pd.read_excel(excel_file)
        print(f"成功读取Excel，共 {len(df)} 行数据")

        order_numbers = []
        if 'order_number' in df.columns:
            order_numbers = df['order_number'].dropna().tolist()
        else:
            first_column = df.columns[0]
            order_numbers = df[first_column].dropna().tolist()

        print(f"找到 {len(order_numbers)} 个订单号")

        if not order_numbers:
            print("没有找到订单号")
            return

        deleter = OrderDeleter(token, max_workers=5)  # 减少并发数

        # 分批处理
        total_batches = (len(order_numbers) + batch_size - 1) // batch_size
        success_total = 0
        fail_total = 0

        for batch_idx in range(total_batches):
            start_idx = batch_idx * batch_size
            end_idx = min((batch_idx + 1) * batch_size, len(order_numbers))
            batch_orders = order_numbers[start_idx:end_idx]

            print(f"\n处理批次 {batch_idx + 1}/{total_batches} (订单 {start_idx + 1}-{end_idx})")

            # 重置计数器
            deleter.success_count = 0
            deleter.fail_count = 0

            # 使用线程池处理当前批次
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(deleter.delete_single_order, order_num)
                           for order_num in batch_orders]

                for future in as_completed(futures):
                    try:
                        future.result()
                    except Exception as exc:
                        print(f'任务异常: {exc}')

            success_total += deleter.success_count
            fail_total += deleter.fail_count

            # 批次间延迟
            if batch_idx < total_batches - 1:  # 不是最后一批
                print(f"等待 {delay} 秒后继续下一批...")
                time.sleep(delay)

        print(f"\n所有批次处理完成！")
        print(f"成功: {success_total}, 失败: {fail_total}")

    except Exception as e:
        print(f"处理Excel文件时发生错误: {e}")


def preview_excel_data(excel_file):
    """预览Excel文件结构"""
    try:
        df = pd.read_excel(excel_file)

        print("Excel文件结构:")
        print(f"列名: {list(df.columns)}")
        print(f"总行数: {len(df)}")
        print("\n前5行数据:")
        print(df.head())

        first_column = df.columns[0]
        print(f"\n第一列 '{first_column}' 的数据样本:")
        print(df[first_column].head(10))

        # 统计空值
        null_count = df[first_column].isnull().sum()
        print(f"\n空值数量: {null_count}")

    except Exception as e:
        print(f"预览Excel文件时发生错误: {e}")


if __name__ == "__main__":
    # 配置参数
    EXCEL_FILE = r'C:\Users\bliuj\Desktop\kerry\FOMS生产主流程\其他\delete_orders.xlsx'
    TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjEwMDQsInVzZXJOYW1lIjoidG9yaS5zaG9wbGluZSIsImlhdCI6MTc2MTI3MTE1NSwiZXhwIjoxNzYxODc1OTU1fQ.ikK6hs07sopLXT1qPiuY0gWA0jTMqPr_beGp6tE6TP0"
    print("=== 多线程订单删除工具 ===")
    print("1. 预览Excel数据")
    print("2. 多线程快速删除（高并发）")
    print("3. 分批删除（稳健模式）")
    print("4. 自定义线程数删除")

    choice = input("请选择操作 (1/2/3/4): ").strip()

    if choice == "1":
        preview_excel_data(EXCEL_FILE)
    elif choice == "2":
        # 高并发模式
        delete_orders_multithreaded(EXCEL_FILE, TOKEN, max_workers=15)
    elif choice == "3":
        # 稳健模式
        delete_orders_batch(EXCEL_FILE, TOKEN, batch_size=50, delay=2)
    elif choice == "4":
        # 自定义模式
        workers = input("请输入线程数 (推荐5-20): ").strip()
        try:
            workers = int(workers)
            if workers < 1 or workers > 50:
                print("线程数应在1-50之间，使用默认值10")
                workers = 10
        except:
            print("输入无效，使用默认值10")
            workers = 10

        delete_orders_multithreaded(EXCEL_FILE, TOKEN, max_workers=workers)
    else:
        print("无效选择")