import json
import re
import requests
from typing import Dict, Any, Optional


def create_pick_wave(properties: Dict[str, Any], login: Dict[str, Any], wave_data: Dict[str, Any]) -> Optional[
    Dict[str, Any]]:
    """
    创建拣货波次

    Args:
        properties: 配置属性字典
        login: 登录信息字典
        wave_data: 波次数据，包含centre_id, client_id, order_ids

    Returns:
        波次信息字典或None（失败时）
    """
    base_url = properties["TWMS_URL"].rstrip('/')
    url = f"{base_url}/opt/pick_wave"

    # 创建会话并设置headers
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

    # 准备请求数据
    payload = {
        "_token": login['csrf_token'],
        "centre_id": wave_data["centre_id"],
        "client_ids": wave_data["client_id"],
        "form_submit": ""
    }

    try:
        # 发送请求
        response = session.post(url, data=payload)
        response.raise_for_status()  # 如果响应状态码不是200，将抛出异常

        response_text = response.text

        # 检查响应内容
        if "W0" not in response_text:
            # 尝试解析JSON响应
            try:
                response_data = response.json()
                if response_data.get('code') != 200:
                    print("创建波次失败")
                    print("响应内容:", response_text)
                    return None
            except json.JSONDecodeError:
                print("创建波次失败 - 响应不是有效的JSON格式")
                print("响应内容:", response_text)
                return None

        # 提取波次ID
        pick_wave_id_match = re.search(r"/opt/pick_wave/(\d+)/add-orders", response_text)
        if not pick_wave_id_match:
            print("无法从响应中提取波次ID")
            print("响应内容:", response_text)
            return None

        pick_wave_id = pick_wave_id_match.group(1)

        # 提取波次号
        pick_wave_num_match = re.search(r"<title>(.+?) \| WMS @", response_text)
        if not pick_wave_num_match:
            print("无法从响应中提取波次号")
            print("响应内容:", response_text)
            return None

        pick_wave_num = pick_wave_num_match.group(1)

        print(f"波次号：{pick_wave_num}")

        # 返回波次信息
        return {
            "pick_wave_id": int(pick_wave_id),
            "pick_wave_num": pick_wave_num,
            "client_id": int(wave_data["client_id"]),
            "centre_id": int(wave_data["centre_id"]),
            "order_ids": wave_data["order_ids"]
        }

    except requests.exceptions.RequestException as e:
        print(f"请求失败：{e}")
        return None