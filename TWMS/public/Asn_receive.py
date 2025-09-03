import json
import requests


def asn_receive(properties, login, asn_data):
    """
    批量收货函数

    参数:
    properties (dict): 配置字典，包含:
        - "twms_url": TWMS系统URL
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
    url = f"{properties['TWMS_URL'].rstrip('/')}/opt/asn/receive/ajax/batch_submit"

    # 构建收货数据
    receive_items = []
    for item in asn_data['items']:
        receive_items.append({
            "asn_number": asn_data['asn_number'],
            "po_number": item.get('po_number', ''),
            "carton": "",
            "location": properties["location"],
            "expire_at": "",
            "manufacture_at": "",
            "batch": "",
            "udf_1": "",
            "udf_2": "",
            "udf_3": "",
            "qty": item['qty'],
            "barcode": item['barcode'],
            "barcode_type": "default",
            "serial_number": "",
            "condition": "GOOD",
            "pre_carton_qty": "1",
            "receiving_unit": "ea",
            "boxid": ""
        })

    # 构建请求数据
    asn_receive_data = {
        "total": len(receive_items),
        "data": receive_items
    }

    payload = {'data': json.dumps(asn_receive_data)}
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token'],
        'Cookie': f"XSRF-TOKEN={login['cookies']['XSRF-TOKEN']}; laravel_session={login['cookies']['laravel_session']}"
    }
    try:
        response = requests.post(url, headers=headers, data=payload)
        response_data = response.json()

        if response_data.get("status") == 0:
            print("批量收货成功")
            return {"status": "success", "message": "批量收货成功"}
        else:
            error_msg = f"批量收货失败：{response.text}"
            print(error_msg)
            return {"status": "error", "message": error_msg}

    except requests.exceptions.RequestException as e:
        error_msg = f"请求失败: {str(e)}"
        print(error_msg)
        return {"status": "error", "message": error_msg}
    except json.JSONDecodeError as e:
        error_msg = f"响应解析失败: {str(e)}"
        print(error_msg)
        return {"status": "error", "message": error_msg}


