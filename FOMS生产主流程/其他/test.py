import pandas as pd
import requests
import json
import time
from openpyxl import load_workbook


def delete_orders_from_excel():
    """从Excel读取订单号并调用删除接口"""

    # Excel文件路径
    excel_file = r'C:\Users\bliuj\Desktop\kerry\FOMS生产主流程\其他\delete_orders.xlsx'

    # 认证token
    token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjM2NiwidXNlck5hbWUiOiIyMDI0MDgxNS5iYWNrIiwiaWF0IjoxNzUzNjcxMDMxLCJleHAiOjE3NTQyNzU4MzF9.A8fpuA4ox1N9Lzl4uWRyG2htLDr0xUU0Qc9Gc-vCbm4"

    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    try:
        # 方法1：使用pandas读取Excel
        print("正在读取Excel文件...")
        df = pd.read_excel(excel_file)
        print(f"成功读取Excel，共 {len(df)} 行数据")

        # 假设订单号在'order_number'列，如果没有这个列名，请修改为实际的列名
        # 或者使用第一列
        order_numbers = []

        if 'order_number' in df.columns:
            order_numbers = df['order_number'].dropna().tolist()
        else:
            # 如果没有order_number列，使用第一列
            first_column = df.columns[0]
            order_numbers = df[first_column].dropna().tolist()

        print(f"找到 {len(order_numbers)} 个订单号")

        # 批量删除订单
        success_count = 0
        fail_count = 0

        for i, order_number in enumerate(order_numbers, 1):
            print(f"正在删除第 {i}/{len(order_numbers)} 个订单: {order_number}")

            payload = {
                "order_number": str(order_number).strip()  # 确保是字符串并去除空格
            }

            try:
                response = requests.post(
                    'https://stg-foms-api.kec-app.com/api/foms/v2/order/delete',
                    headers=headers,
                    json=payload,  # 使用json参数自动序列化
                    timeout=30
                )

                if response.status_code == 200:
                    response_data = response.json()
                    if response_data.get('code') == 200 or response_data.get('success'):
                        print(f"✅ 删除成功: {order_number}")
                        success_count += 1
                    else:
                        print(f"❌ 删除失败: {order_number} - {response_data.get('message', '未知错误')}")
                        fail_count += 1
                else:
                    print(f"❌ HTTP错误 {response.status_code}: {order_number} - {response.text}")
                    fail_count += 1

            except requests.exceptions.RequestException as e:
                print(f"❌ 请求异常: {order_number} - {str(e)}")
                fail_count += 1

            # 添加延迟，避免请求过于频繁
            time.sleep(0.5)

        print(f"\n删除完成！成功: {success_count}, 失败: {fail_count}")

    except FileNotFoundError:
        print(f"错误: 找不到文件 {excel_file}")
    except Exception as e:
        print(f"读取Excel文件时发生错误: {e}")


def delete_orders_from_excel_openpyxl():
    """使用openpyxl读取Excel文件（备选方案）"""

    excel_file = r'C:\Users\bliuj\Desktop\kerry\FOMS生产主流程\其他\delete_orders.xlsx'
    token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJrZWNfaGtfb21zX3YyLjAiLCJ1c2VySWQiOjEwMDQsInVzZXJOYW1lIjoidG9yaS5zaG9wbGluZSIsImlhdCI6MTc2MTIzMTA2MywiZXhwIjoxNzYxODM1ODYzfQ.Zaxgd9x-s_e52ti_UkTXeLCqwPY9yjQKt1_6E9cF1ws"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    try:
        print("正在使用openpyxl读取Excel文件...")
        workbook = load_workbook(excel_file)
        sheet = workbook.active

        order_numbers = []

        # 从第二行开始读取（假设第一行是标题）
        for row in range(2, sheet.max_row + 1):
            cell_value = sheet.cell(row=row, column=1).value
            if cell_value:  # 只处理非空单元格
                order_numbers.append(str(cell_value).strip())

        print(f"找到 {len(order_numbers)} 个订单号")

        if not order_numbers:
            print("没有找到订单号，请检查Excel文件格式")
            return

        success_count = 0
        fail_count = 0

        for i, order_number in enumerate(order_numbers, 1):
            print(f"正在删除第 {i}/{len(order_numbers)} 个订单: {order_number}")

            payload = {"order_number": order_number}

            try:
                response = requests.post(
                    'https://foms-api-lbs.kec-app.com/api/foms/v2/order/delete',
                    headers=headers,
                    json=payload,
                    timeout=30
                )

                if response.status_code == 200 or response.status_code == 202:
                    response_data = response.json()
                    if response_data.get('code') == 200 or response.status_code == 202:
                        print(f"✅ 删除成功: {order_number}")
                        success_count += 1
                    else:
                        error_msg = response_data.get('message', response.text)
                        print(f"❌ 删除失败: {order_number} - {error_msg}")
                        fail_count += 1
                else:
                    print(f"❌ HTTP错误 {response.status_code}: {order_number}")
                    fail_count += 1

            except Exception as e:
                print(f"❌ 请求异常: {order_number} - {str(e)}")
                fail_count += 1

            time.sleep(0.5)  # 避免请求过于频繁

        print(f"\n删除完成！成功: {success_count}, 失败: {fail_count}")

    except Exception as e:
        print(f"处理Excel文件时发生错误: {e}")


def preview_excel_data():
    """预览Excel文件结构"""
    try:
        excel_file = r'C:\Users\bliuj\Desktop\kerry\FOMS生产主流程\其他\delete_orders.xlsx'
        df = pd.read_excel(excel_file)

        print("Excel文件结构:")
        print(f"列名: {list(df.columns)}")
        print(f"总行数: {len(df)}")
        print("\n前5行数据:")
        print(df.head())

        # 显示第一列的数据样本
        first_column = df.columns[0]
        print(f"\n第一列 '{first_column}' 的数据样本:")
        print(df[first_column].head(10))

    except Exception as e:
        print(f"预览Excel文件时发生错误: {e}")


if __name__ == "__main__":
    print("=== 订单删除工具 ===")
    print("1. 预览Excel数据")
    print("2. 使用pandas删除订单")
    print("3. 使用openpyxl删除订单")

    choice = input("请选择操作 (1/2/3): ").strip()

    if choice == "1":
        preview_excel_data()
    elif choice == "2":
        delete_orders_from_excel()
    elif choice == "3":
        delete_orders_from_excel_openpyxl()
    else:
        print("无效选择")