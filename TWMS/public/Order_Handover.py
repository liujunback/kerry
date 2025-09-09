import json
import requests
from typing import Dict, Any


def order_handover(properties: Dict[str, Any], twms_login: Dict[str, Any], tracking_number: str) -> None:
    """
    处理订单移交功能

    Args:
        properties: 配置属性字典
        twms_login: 登录信息字典
        tracking_number: 追踪号码
    """
    base_url = properties["TWMS_URL"].rstrip('/')
    url = f"{base_url}/opt/scan/handover-by-tracking-number"

    # 创建会话并设置headers
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': twms_login['csrf_token']
    })

    # 设置cookies
    cookies = {
        'XSRF-TOKEN': twms_login['cookies']['XSRF-TOKEN'],
        'laravel_session': twms_login['cookies']['laravel_session']
    }
    session.cookies.update(cookies)

    # 准备请求数据
    payload = {
        "tracking_numbers[]": [tracking_number],
        "agent": properties["agent"],
        "actualLpCode": ""
    }

    try:
        # 发送请求
        response = session.post(url, data=payload)
        response.raise_for_status()  # 如果响应状态码不是200，将抛出异常

        # 检查响应内容
        if "Logout" in response.text:
            print(f"移交成功：{tracking_number}")
            return

        # 尝试解析JSON响应
        response_data = response.json()
        if response_data.get('code') == 200:
            print(f"移交成功：{tracking_number}")
        else:
            print(f"移交失败：{response.text}")

    except requests.exceptions.RequestException as e:
        print(f"请求失败：{e}")
    except json.JSONDecodeError:
        print(f"响应不是有效的JSON格式：{response.text}")