import datetime
import json
import re

import requests


def asn_confirm(properties, login, asn_data):
    """
    确认ASN收货函数

    参数:
    properties (dict): 配置字典，包含:
        - "twms_url": TWMS系统URL
    login (dict): 登录信息，包含:
        - "csrf_token": CSRF令牌
        - "cookies": 包含XSRF-TOKEN和laravel_session的cookie字典
    asn_data (dict): ASN数据，包含:
        - "asn_id": ASN的ID
        - "item_ids": 商品ID列表（可选）
        - "item_count": 商品总数（可选）
    """
    asn_data_id = select_asn_id(properties, login, asn_data["asn_number"])


    # 构建URL
    url = f"{properties['TWMS_URL'].rstrip('/')}/opt/asn/confirm/{asn_data_id['asn_id']}"

    # 准备请求头
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token'],
        'Cookie': f"XSRF-TOKEN={login['cookies']['XSRF-TOKEN']}; laravel_session={login['cookies']['laravel_session']}"
    }

    # 准备请求数据
    item_ids = asn_data_id.get("item_ids", [])
    item_count = asn_data_id.get("item_count", len(item_ids))

    payload = {
        '_token': login['csrf_token'],
        'confirm_type': 'all',
        'number_of_carton': '0',
        'ata_at': datetime.datetime.now().strftime('%Y-%m-%d'),
        'item': str(item_count),
        'carton': '0',
        'pallet': '0'
    }

    # 添加item_ids参数（如果有）
    for item_id in item_ids:
        payload[f'item_ids[]'] = str(item_id)

    try:
        response = requests.post(url, headers=headers, data=payload)

        # 检查响应
        if "Create ASN" in response.text:
            result_msg = "全部确认收货成功"
            print(result_msg)
            return {"status": "success", "message": result_msg}
        else:
            result_msg = f"确认收货失败: {response.text}"
            print(result_msg)
            return {"status": "error", "message": result_msg}

    except requests.exceptions.RequestException as e:
        error_msg = f"请求失败: {str(e)}"
        print(error_msg)
        return {"status": "error", "message": error_msg}


import json
import re
import requests
from typing import Dict, Any, Optional


def select_asn_id(properties: Dict[str, Any], login: Dict[str, Any], asn_number: str) -> Optional[Dict[str, Any]]:
    """
    获取ASN ID和Item ID的函数

    参数:
    properties (dict): 配置字典，包含:
        - "TWMS_URL": TWMS系统URL
    login (dict): 登录信息，包含:
        - "csrf_token": CSRF令牌
        - "cookies": 包含XSRF-TOKEN和laravel_session的cookie字典
    asn_number (str): ASN编号

    返回:
    dict: 包含ASN ID、ASN编号、项目数量和项目ID的字典，或在失败时返回None
    """
    # 构建请求头
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token'],
        'Cookie': f"XSRF-TOKEN={login['cookies']['XSRF-TOKEN']}; laravel_session={login['cookies']['laravel_session']}"
    }

    # 构建ASN列表查询URL
    base_url = properties['TWMS_URL'].rstrip('/')
    asn_list_url = f"{base_url}/opt/asn/ajax/list?draw=2&columns%5B0%5D%5Bdata%5D=selection&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=false&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=id&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=asn_number&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D={asn_number}&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=centre_name&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=client_company_name&columns%5B4%5D%5Bname%5D=client_id&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=asn_date&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=eta_at&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=ata_at&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=confirmed_at&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=confirmer_name&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=status_text&columns%5B10%5D%5Bname%5D=asns.status&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B11%5D%5Bdata%5D=is_block&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=false&columns%5B11%5D%5Borderable%5D=false&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bdata%5D=is_return_asn&columns%5B12%5D%5Bname%5D=is_return_asn&columns%5B12%5D%5Bsearchable%5D=true&columns%5B12%5D%5Borderable%5D=false&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B13%5D%5Bdata%5D=receive_details&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=false&columns%5B13%5D%5Borderable%5D=false&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B14%5D%5Bdata%5D=receiving_progress&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=true&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bdata%5D=actions&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=false&columns%5B15%5D%5Borderable%5D=false&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=1&order%5B0%5D%5Bdir%5D=desc&start=0&length=10&search%5Bvalue%5D=&search%5Bregex%5D=false&status=&_=1716170780277"

    try:
        # 获取ASN列表
        response = requests.get(asn_list_url, headers=headers)

        if response.status_code != 200:
            print(f"获取ASN列表失败: {response.status_code} - {response.text}")
            return None

        response_data = response.json()

        if not response_data.get('data') or len(response_data['data']) == 0:
            print(f"未找到ASN: {asn_number}")
            return None

        asn_id = response_data['data'][0]['id']

        # 获取项目列表
        item_list_url = f"{base_url}/opt/asn_item/ajax/list?asn_id={asn_id}&draw=1&columns%5B0%5D%5Bdata%5D=id&columns%5B0%5D%5Bname%5D=&columns%5B0%5D%5Bsearchable%5D=true&columns%5B0%5D%5Borderable%5D=true&columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B1%5D%5Bdata%5D=sku.code&columns%5B1%5D%5Bname%5D=&columns%5B1%5D%5Bsearchable%5D=true&columns%5B1%5D%5Borderable%5D=true&columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B2%5D%5Bdata%5D=sku.barcode&columns%5B2%5D%5Bname%5D=&columns%5B2%5D%5Bsearchable%5D=true&columns%5B2%5D%5Borderable%5D=true&columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B3%5D%5Bdata%5D=unit_price&columns%5B3%5D%5Bname%5D=&columns%5B3%5D%5Bsearchable%5D=true&columns%5B3%5D%5Borderable%5D=true&columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B4%5D%5Bdata%5D=currency&columns%5B4%5D%5Bname%5D=&columns%5B4%5D%5Bsearchable%5D=true&columns%5B4%5D%5Borderable%5D=true&columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B5%5D%5Bdata%5D=estimated_qty&columns%5B5%5D%5Bname%5D=&columns%5B5%5D%5Bsearchable%5D=true&columns%5B5%5D%5Borderable%5D=true&columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B6%5D%5Bdata%5D=actual_qty&columns%5B6%5D%5Bname%5D=&columns%5B6%5D%5Bsearchable%5D=true&columns%5B6%5D%5Borderable%5D=true&columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B7%5D%5Bdata%5D=po_number&columns%5B7%5D%5Bname%5D=&columns%5B7%5D%5Bsearchable%5D=true&columns%5B7%5D%5Borderable%5D=true&columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B8%5D%5Bdata%5D=po_date&columns%5B8%5D%5Bname%5D=&columns%5B8%5D%5Bsearchable%5D=true&columns%5B8%5D%5Borderable%5D=true&columns%5B8%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B8%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B9%5D%5Bdata%5D=carton&columns%5B9%5D%5Bname%5D=&columns%5B9%5D%5Bsearchable%5D=true&columns%5B9%5D%5Borderable%5D=true&columns%5B9%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B9%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B10%5D%5Bdata%5D=pallet&columns%5B10%5D%5Bname%5D=&columns%5B10%5D%5Bsearchable%5D=true&columns%5B10%5D%5Borderable%5D=true&columns%5B10%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B10%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B11%5D%5Bdata%5D=udf_1&columns%5B11%5D%5Bname%5D=&columns%5B11%5D%5Bsearchable%5D=true&columns%5B11%5D%5Borderable%5D=true&columns%5B11%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B11%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B12%5D%5Bdata%5D=udf_2&columns%5B12%5D%5Bname%5D=&columns%5B12%5D%5Bsearchable%5D=true&columns%5B12%5D%5Borderable%5D=true&columns%5B12%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B12%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B13%5D%5Bdata%5D=udf_3&columns%5B13%5D%5Bname%5D=&columns%5B13%5D%5Bsearchable%5D=true&columns%5B13%5D%5Borderable%5D=true&columns%5B13%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B13%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B14%5D%5Bdata%5D=manufacture_at&columns%5B14%5D%5Bname%5D=&columns%5B14%5D%5Bsearchable%5D=true&columns%5B14%5D%5Borderable%5D=true&columns%5B14%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B14%5D%5Bsearch%5D%5Bregex%5D=false&columns%5B15%5D%5Bdata%5D=expire_at&columns%5B15%5D%5Bname%5D=&columns%5B15%5D%5Bsearchable%5D=true&columns%5B15%5D%5Borderable%5D=true&columns%5B15%5D%5Bsearch%5D%5Bvalue%5D=&columns%5B15%5D%5Bsearch%5D%5Bregex%5D=false&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=desc&start=0&length=100&search%5Bvalue%5D=&search%5Bregex%5D=false&_=1716175009729"

        item_response = requests.get(item_list_url, headers=headers)

        if item_response.status_code != 200:
            print(f"获取项目列表失败: {item_response.status_code} - {item_response.text}")
            return None

        item_data = item_response.json()

        if not item_data.get('data') or len(item_data['data']) == 0:
            print(f"ASN {asn_number} 没有项目数据")
            return None

        item_id = item_data['data'][0]['id']

        # 使用正则表达式提取总数量
        qty_match = re.search(r"Total Est\. Qty: (.+?)<br", response.text)
        asn_item_qty = int(qty_match.group(1)) if qty_match else 0

        # 构建返回数据
        asn_data_id = {
            "asn_id": asn_id,
            "asn_item_qty": asn_item_qty,
            "asn_number": asn_number,
            "item_id": item_id
        }

        print(f"成功获取ASN数据: {asn_data_id}")
        return asn_data_id

    except requests.exceptions.RequestException as e:
        print(f"请求失败: {str(e)}")
        return None
    except (KeyError, IndexError, json.JSONDecodeError) as e:
        print(f"数据处理失败: {str(e)}")
        return None
