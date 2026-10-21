import json
import os
import time
import datetime
import random
import requests
from urllib.parse import urljoin
from urllib3.exceptions import InsecureRequestWarning
from requests.exceptions import RequestException

# 全局禁用SSL警告
requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)


def Order_Create(properties, token):
    """
    优化后的订单创建函数

    参数:
        properties: 配置字典，包含:
            - url: API基础URL
            - order_txt: 订单模板文件名
        token: 认证token

    返回:
        str: 追踪号 (成功时) 或 "失败" (失败时)
    """
    # 1. 验证必要参数
    required_keys = ['url', 'order_txt']
    if not all(key in properties for key in required_keys):
        missing = [key for key in required_keys if key not in properties]
        print(f"错误：缺少必要参数: {', '.join(missing)}")
        return "失败"

    try:
        # 2. 安全构建文件路径
        data_dir = os.path.join(os.path.dirname(__file__), "..", "..", "生产主流程", "data")
        order_file = os.path.join(data_dir, properties['order_txt'])

        # 3. 读取订单模板
        with open(order_file, 'r', encoding='utf-8') as f:
            order_data = json.load(f)

        # 4. 生成唯一参考号
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        reference_number = f"ITTEST{timestamp}{random.randint(1, 300)}"

        # 5. 更新订单数据
        order_data['package']['reference_number'] = reference_number

        # 6. 安全构建URL
        base_url = properties['url']
        endpoint = "pos-web/shipment/create"
        full_url = urljoin(base_url, endpoint)

        # 7. 准备请求头
        headers = {
            'Content-Type': 'application/json',
            "Authorization": f"Bearer {token}"
        }

        # 8. 发送请求并计时
        start_time = time.perf_counter()
        print(full_url)
        response = requests.post(
            full_url,
            json=order_data,  # 使用json参数自动序列化
            headers=headers,
            verify=False,
            timeout=30  # 添加超时
        )
        elapsed_time = time.perf_counter() - start_time

        print(f'下单耗时：{elapsed_time:.2f}s | 参考号: {reference_number}')

        # 9. 处理响应
        if response.status_code == 201:
            try:
                response_data = response.json()
                tracking_number = response_data.get("data", {}).get("tracking_number")
                if tracking_number:
                    print(response.text)
                    print(f"运单号：{tracking_number}")
                    label_url = response_data.get("data", {}).get("label_url")
                    address_to_check = order_data['receiver']['post_code']  # 替换为实际要校验的地址
                    exists = check_address_in_pdf(label_url, address_to_check)
                    if exists:
                        print("✅ 地址存在于 PDF 中")
                    else:
                        print("❌ 地址不存在于 PDF 中")
                    return tracking_number
                else:
                    print(f"响应中缺少追踪号: {response.text}")
            except json.JSONDecodeError:
                print(f"响应JSON解析失败: {response.text}")
        else:
            print(f"下单失败 (HTTP {response.status_code}): {response.text}")

        return "失败"

    except FileNotFoundError:
        print(f"错误：订单模板文件不存在: {order_file}")
        return "失败"
    except json.JSONDecodeError as e:
        print(f"订单模板JSON解析错误: {str(e)}")
        return "失败"
    except RequestException as e:
        print(reference_number)
        print(f"网络请求异常: {str(e)}")
        return "失败"
    except KeyError as e:
        print(f"数据结构错误: 缺少键 {str(e)}")
        return "失败"
    except Exception as e:
        print(f"未知错误: {str(e)}")
        return "失败"


import requests
import pdfplumber
import io

def check_address_in_pdf(label_url: str, target_address: str) -> bool:
    """
    下载 PDF 并检查目标地址是否出现在其文本内容中。

    Args:
        label_url: PDF 文件的 URL
        target_address: 需要校验的地址字符串

    Returns:
        bool: 地址存在返回 True，否则返回 False
    """
    try:
        # 1. 下载 PDF
        response = requests.get(label_url, timeout=30)
        response.raise_for_status()  # 如果请求失败则抛出异常

        # 2. 将下载内容作为字节流加载到 pdfplumber
        with pdfplumber.open(io.BytesIO(response.content)) as pdf:
            full_text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    full_text += page_text + "\n"

        # 3. 校验地址是否存在
        if target_address in full_text:
            return True
        else:
            return False

    except requests.exceptions.RequestException as e:
        print(f"PDF 下载失败: {e}")
        return False
    except Exception as e:
        print(f"PDF 解析失败: {e}")
        return False


