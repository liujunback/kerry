import json
import re
import requests
from typing import Dict, Any, Optional


def create_session(login: Dict[str, Any]) -> requests.Session:
    """创建并配置请求会话"""
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token']
    })

    # 设置cookies
    cookies = {
        'XSRF-TOKEN': login['cookies']['XSRF-TOKEN'],
        'laravel_session': login['cookies']['laravel_session']
    }
    session.cookies.update(cookies)

    return session


def order_handover_pallet(properties: Dict[str, Any], login: Dict[str, Any], tracking_number: str) -> None:
    """处理托盘交接流程"""
    base_url = properties["TWMS_URL"].rstrip('/')
    session = create_session(login)

    # 第一步：打板
    build_pallet_url = f"{base_url}/opt/build_pallet/updateShipment"
    payload = {
        "track_num[]": tracking_number,
        "type": "single",
        "logistics_provider_id": "",
    }

    try:
        response = session.post(build_pallet_url, data=payload)
        response_data = response.json()

        if response_data.get('status') != 200:
            print(f"打板失败：{response.text}")
            return

        pallet_number = response_data['pallet_number']
        print(f"打板成功：{response_data['url']}")
        print(f"托盘号：{pallet_number}")

        # 第二步：获取交接信息
        handover_data = get_handover_data(properties, session)
        if not handover_data:
            print("获取交接信息失败")
            return

        handover_id = handover_data["handover_id"]
        hand_id = handover_data["hand_id"]

        # 第三步：扫描交接托盘
        scan_url = f"{base_url}/opt/scan/handover/pallet_number?pallet_number={pallet_number}&handover_id={handover_id}"
        response = session.get(scan_url)
        response_data = response.json()

        if response_data.get('code') != 200:
            print(f"扫描交接托盘失败：{response.text}")
            return

        # 第四步：打印交接清单
        print_url = f"{base_url}/opt/scan/handover/print_handover_list?handover_number={hand_id}"
        response = session.get(print_url)
        response_data = response.json()

        if response_data.get('code') == 0:
            print(f"等待移交成功：{response_data['data']['url']}")
        else:
            print(f"打印交接清单失败：{response.text}")
        handover_url = f"{base_url}/opt/scan/handover/confirm"
        payload = {
            "handoverNumber": hand_id
        }
        response = session.post(handover_url, data=payload)
        if response.status_code ==200:
            print("移交成功：")
    except requests.exceptions.RequestException as e:
        print(f"请求失败：{e}")
    except json.JSONDecodeError as e:
        print(f"JSON解析失败：{e}")


def get_handover_data(properties: Dict[str, Any], session: requests.Session) -> Optional[Dict[str, str]]:
    """获取交接信息"""
    base_url = properties["TWMS_URL"].rstrip('/')
    url = f"{base_url}/opt/scan/handover/show"
    payload = {"code": "SELFPICK"}

    try:
        response = session.post(url, data=payload)
        response.raise_for_status()

        # 使用更健壮的方式提取hand_id
        hand_id_match = re.search(r'HAND\d+', response.text)
        if not hand_id_match:
            print("未找到交接批次ID")
            return None

        hand_id = hand_id_match.group()
        print(f"移交批次: {hand_id}")

        # 获取交接详情页面
        detail_url = f"{base_url}/opt/scan/handover/SELFPICK/{hand_id}"
        response = session.get(detail_url)
        response.raise_for_status()

        # 使用更健壮的方式提取handover_id
        handover_id_match = re.search(r'name="handover_id"[^>]*value="(\d+)"', response.text)
        if not handover_id_match:
            print("未找到交接ID")
            return None

        handover_id = handover_id_match.group(1)
        print(f"移交批次ID: {handover_id}")

        return {
            "hand_id": hand_id,
            "handover_id": handover_id
        }

    except requests.exceptions.RequestException as e:
        print(f"获取交接信息请求失败：{e}")
        return None