import json
import random
import requests


def qh_asn_receive(properties, login, asn_data):
    """
    批量收货函数

    参数:
    properties (dict): 配置字典，包含:
        - "TWMS_URL": TWMS系统URL
        - "location": 收货位置
    login (dict): 登录信息，包含:
        - "csrf_token": CSRF令牌
        - "cookies": 包含XSRF-TOKEN和laravel_session的cookie字典
    asn_data (dict): ASN数据，包含:
        - "asn_number": ASN编号
        - "items": 商品列表，每个商品包含:
            - "code": 商品编码
            - "barcode": 商品条码
            - "qty": 数量
            - "po_number": PO编号
    """
    base_url = properties['TWMS_URL'].rstrip('/')
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token'],
        'Cookie': f"XSRF-TOKEN={login['cookies']['XSRF-TOKEN']}; laravel_session={login['cookies']['laravel_session']}"
    }

    try:
        # 1. 签收ASN
        if not _sign_asn_receipt(base_url, headers, asn_data['asn_number']):
            return {"status": "error", "message": "签收失败"}

        # 2. 生成入库箱号
        inbound_boxid = _generate_inbound_boxid(base_url, headers, properties)
        if not inbound_boxid:
            return {"status": "error", "message": "生成入库箱号失败"}

        # 3. 处理所有商品关箱操作
        if not _process_items_close_box(base_url, headers, asn_data, inbound_boxid):
            return {"status": "error", "message": "商品关箱处理失败"}

        # 4. 上架操作
        if not _put_away(base_url, headers, properties['location'], inbound_boxid):
            return {"status": "error", "message": "上架操作失败"}

        # 5. 确认收货
        if not _confirm_receipt(base_url, headers, asn_data['asn_number']):
            return {"status": "error", "message": "收货确认失败"}

        print(f"收货流程完成成功：{asn_data['asn_number']}")
        return {"status": "success", "message": "收货流程完成"}

    except requests.exceptions.RequestException as e:
        error_msg = f"请求失败: {str(e)}"
        print(error_msg)
        return {"status": "error", "message": error_msg}


def _sign_asn_receipt(base_url, headers, asn_number):
    """签收ASN"""
    url = f"{base_url}/opt/asn/sign_for_receipt/confirm"
    data = {"asn_numbers[]": asn_number}

    response = requests.post(url, headers=headers, data=data)
    if asn_number in response.text:
        print("签收成功")
        return True
    else:
        print(f"签收失败：{response.text}")
        return False


def _generate_inbound_boxid(base_url, headers,properties):
    """生成入库箱号"""
    url = f"{base_url}/opt/quince/receive/check-inbound-box"

    # 尝试生成箱号，最多重试3次
    for _ in range(3):
        inbound_boxid = properties["inbound_boxid_prefix"] + str(random.randint(1000000, 9999999))
        data = {"inbound_boxid": inbound_boxid}

        response = requests.post(url, headers=headers, data=data)
        if response.json().get("code") == 200:
            return inbound_boxid

    print("生成入库箱号失败，重试次数超限")
    return None


def _process_items_close_box(base_url, headers, asn_data, inbound_boxid):
    """处理所有商品关箱操作"""
    url = f"{base_url}/opt/quince/receive/close-box"

    for item in asn_data['items']:
        data = {
            "sku_barcode": item['barcode'],
            "asn_number": asn_data['asn_number'],
            "inbound_boxid": inbound_boxid,
            "qty": item["qty"],
            "condition": "GOOD",
            "udf_1": ""
        }

        response = requests.post(url, headers=headers, data=data)
        if response.json().get("code") != 200:
            print(f"商品关箱失败：{item['barcode']}")
            return False

    print(f"入库包关包成功：{inbound_boxid}")
    return True


def _get_bin_id(base_url, headers, location):
    """获取库位ID"""
    url = f"{base_url}/opt/quince/put-away/bin"
    data = {"location": location}

    response = requests.post(url, headers=headers, data=data)
    if response.json().get("code") == 200:
        return response.json().get("data", {}).get("bin_id")
    return None


def _put_away(base_url, headers, location, inbound_boxid):
    """上架操作"""
    # 获取库位ID
    bin_id = _get_bin_id(base_url, headers, location)
    if not bin_id:
        print("获取库位ID失败")
        return False

    # 执行上架
    url = f"{base_url}/opt/quince/put-away/put-away"
    data = {
        "bin_id": bin_id,
        "inbound_boxid": inbound_boxid
    }

    response = requests.post(url, headers=headers, data=data)
    if response.json().get("code") == 200:
        print("上架成功")
        return True
    else:
        print("上架失败")
        return False


def _confirm_receipt(base_url, headers, asn_number):
    """确认收货"""
    url = f"{base_url}/opt/quince/asn/receive-confirm"
    data = {"asn_number": asn_number}

    response = requests.post(url, headers=headers, data=data)
    if response.json().get("code") == 200:
        print(f"收货确认成功：{asn_number}")
        return True
    else:
        print(f"收货确认失败：{asn_number}")
        return False