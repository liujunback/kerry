import json
import requests
import time
from urllib.parse import urljoin
from typing import Dict, Any


def Check_Weight(
        box_num: str,
        properties: Dict[str, str],
        token: str,
        max_retries: int = 3,
        retry_delay: float = 2.0
) -> bool:
    """
    执行称重检查操作

    :param box_num: 箱号
    :param properties: 配置属性字典
    :param token: 认证token
    :param max_retries: 最大重试次数
    :param retry_delay: 重试延迟(秒)
    :return: 是否成功
    """
    base_url = properties['ops_url']
    endpoint = "/operations/outbound/checkWeight"
    url = base_url + endpoint

    # 准备称重数据（实际值应根据业务需求调整）
    payload = {
        "boxTypeCode": "BAFYL",
        "boxNumber": box_num,
        "weighingWeight": "2700",  # 称重重量
        "length": 490,  # 长度(mm)
        "width": 490,  # 宽度(mm)
        "height": 630,  # 高度(mm)
        "weight": 1700  # 重量(g)
    }

    headers = {
        'token': token,
        'Authorization': token,
        'Content-Type': 'application/json'
    }

    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                json=payload,  # 自动处理JSON序列化
                headers=headers,
                verify=False,
                timeout=10  # 请求超时设置
            )
            response.raise_for_status()  # 检查HTTP状态码

            result = response.json()
            if result.get("code") == 200:
                msg = result.get("msg", "称重检查成功")
                print(f"✅ {msg} | 箱号: {box_num}")
                return True
            else:
                error_msg = result.get("msg") or response.text
                print(f"❌ 称重检查失败 | 错误信息: {error_msg}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"⚠️ 请求异常 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 1.5  # 指数退避策略
            else:
                print(f"❌ 称重操作最终失败: {str(e)}")
                return False
        except json.JSONDecodeError:
            print(f"❌ 响应解析失败 | 原始响应: {response.text[:200]}...")
            return False