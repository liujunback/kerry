import json
import requests
from typing import Dict, Any, Optional


def pick_add_order(properties: Dict[str, Any], login: Dict[str, Any], pick_wave_data: Dict[str, Any]) -> Optional[str]:
    """
    将订单添加到拣货波次

    Args:
        properties: 配置属性字典
        login: 登录信息字典
        pick_wave_data: 拣货波次数据

    Returns:
        成功消息或None（失败时）
    """
    base_url = properties["TWMS_URL"].rstrip('/')
    url = f"{base_url}/opt/pick_wave/{pick_wave_data['pick_wave_id']}/add-orders"

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
        "client_id[]": pick_wave_data["client_id"],
        "order_number": "",
        "ordertype": "",
        "is_partial_allocate_stock": 0,
        "sku_code": "",
        "sku_barcode": "",
        "order_items_greater": "",
        "order_items_less": "",
        "one_order_one_item": 0,
        "logistics_provider_id": "",
        "consignee_country": "",
        "consignee_city": "",
        "order_date": "",
        "created_at": "",
        "etd_at": "",
        "is_contain_temperature_control_items": "",
        "sku_tag": "",
        "number_of_available_tote": "",
        "is_validation_cbm": 0,
        "pick_remark": "",
        "postcode_zone": "",
        "requested_delivery_date": "",
        "channel": "",
        "packing_material_type": "",
        "print_type": "print",
        "ids[]": pick_wave_data["pick_wave_id"],
        "dataTables_length": 10,
        "add_order_ids[]": pick_wave_data["order_ids"],
        "action": "assign"
    }

    try:
        # 发送请求
        response = session.post(url, data=payload)
        response.raise_for_status()  # 如果响应状态码不是200，将抛出异常

        # 尝试解析JSON响应
        response_data = response.json()
        if response_data.get('code') == 200:
            success_msg = "订单关联波次成功"
            print(success_msg)
            return success_msg
        else:
            error_msg = f"订单关联波次失败：{response.text}"
            print(error_msg)
            return None

    except requests.exceptions.RequestException as e:
        error_msg = f"请求失败：{e}"
        print(error_msg)
        return None
    except json.JSONDecodeError:
        error_msg = f"响应不是有效的JSON格式：{response.text}"
        print(error_msg)
        return None