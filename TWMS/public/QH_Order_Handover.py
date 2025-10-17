import json
import requests
from typing import Dict, Any


def qh_order_handover(properties: Dict[str, Any], twms_login: Dict[str, Any], tracking_number: str) -> None:
    """
    处理订单移交功能

    Args:
        properties: 配置属性字典
        twms_login: 登录信息字典
        tracking_number: 追踪号码
    """
    base_url = properties["TWMS_URL"].rstrip('/')
    url = f"{base_url}/opt/quince/build_box/close-box"

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
        "tracking_number_list[]": [tracking_number],
        "box_code": properties["box_type"],
        "operate_type": "M",
        "box_weight": 2.3,
        "trade_mode": "B2B2C"
    }

    try:
        # 发送请求
        response = session.post(url, data=payload)
        response.raise_for_status()  # 如果响应状态码不是200，将抛出异常

        # 检查响应内容
        if response.json().get("code") == 200:
            box_number = response.json().get("data")["box_number"]
            box_label_url = response.json().get("data")["box_label_url"]
            print(f"扫描大包成功：{box_number}")
            print(f"大包面单：{box_label_url}")
            pda_url = f"{base_url}/android/quince/handover/by-big-box"
            pda_data = {"pallet_numbers":[box_number]}
            header = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {properties["api_token"]}'
            }
            response = session.post(pda_url, data=json.dumps(pda_data),headers =header)
        # 尝试解析JSON响应
        response_data = response.json()
        if response_data.get('code') == 0:
            handover_number = response.json().get("data")["handover_number"]

            handover_url = f"{base_url}/opt/scan/handover/confirm"
            payload = {
                "handoverNumber": handover_number
            }
            response = session.post(handover_url, data=payload)
            if response.status_code == 200:
                print(f"移交成功：{handover_number}")
        else:
            print(f"移交失败：{response.text}")

    except requests.exceptions.RequestException as e:
        print(f"请求失败：{e}")
    except json.JSONDecodeError:
        print(f"响应不是有效的JSON格式：{response.text}")