import pandas as pd
import requests
import time
from urllib.parse import quote
import os
os.environ["NO_PROXY"] = "tms-eng.kec.kln.cn"
# 配置参数
EXCEL_FILE = "invoice_ids.xlsx"  # Excel文件路径
COLUMN_NAME = "invocieIdList"  # 发票ID所在列名
API_URL = "https://tms-eng.kec.kln.cn/tms-saas-web/bms/invoice/cancelinvoice"
DELAY_SECONDS = 1  # 每次请求间隔时间，避免请求过快
# from TMS.public.TMS_Login import login
token = "381dfe46-dcf6-4fd1-8cf8-f837138de951"

def read_invoice_ids_from_excel(file_path, column_name):
    """从Excel读取发票ID列表"""
    try:
        df = pd.read_excel(file_path)
        if column_name not in df.columns:
            print(f"错误：Excel文件中不存在列 '{column_name}'")
            return []
        # 去除空值并转换为整数（根据实际情况调整类型）
        ids = df[column_name].dropna().astype(int).tolist()
        print(f"成功读取 {len(ids)} 个发票ID")
        return ids
    except Exception as e:
        print(f"读取Excel文件失败：{e}")
        return []


def cancel_invoice(invoice_id):
    """调用取消发票接口"""
    data = {"invocieIdList": invoice_id,"token":token}

    try:
        response = requests.post(
            API_URL,
            data=data,
            timeout=10
        )

        print(f"发票ID {invoice_id} 响应状态码: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"  响应内容: {result}")
            return result
        else:
            print(f"  请求失败，状态码: {response.status_code}")
            print(f"  响应内容: {response.text}")
            return None

    except Exception as e:
        print(f"  请求异常: {e}")
        return None


def main():
    # 读取发票ID列表
    invoice_ids = read_invoice_ids_from_excel(EXCEL_FILE, COLUMN_NAME)

    if not invoice_ids:
        print("没有找到有效的发票ID，程序退出")
        return

    print(f"开始批量处理，共 {len(invoice_ids)} 个发票ID")
    print("-" * 50)

    # 记录结果
    success_count = 0
    fail_count = 0

    for idx, invoice_id in enumerate(invoice_ids, 1):
        print(f"正在处理第 {idx}/{len(invoice_ids)} 个: 发票ID {invoice_id}")

        # 调用接口
        result = cancel_invoice(invoice_id)

        # 统计结果
        if result and result.get("result_code") == 200:
            success_count += 1
        else:
            fail_count += 1

        # 每次请求后延时
        if idx < len(invoice_ids):
            time.sleep(DELAY_SECONDS)

        print("-" * 30)

    # 输出汇总
    print(f"批量处理完成！成功: {success_count}, 失败: {fail_count}")


if __name__ == "__main__":
    main()