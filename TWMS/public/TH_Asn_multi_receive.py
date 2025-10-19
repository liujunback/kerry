import json
import requests


def th_asn_multi_receive(properties, login, asn_data):
    """
    多层级包装批量收货函数

    参数:
    properties (dict): 配置字典，包含:
        - "TWMS_URL": TWMS系统URL
        - "location": 收货位置
    login (dict): 登录信息，包含:
        - "csrf_token": CSRF令牌
        - "cookies": 包含XSRF-TOKEN和laravel_session的cookie字典
    asn_data (dict): ASN数据，包含:
        - "asn_number": ASN编号
        - "items": 商品列表
        - "storage_unit": 包装层级信息
    """
    base_url = properties['TWMS_URL'].rstrip('/')

    # 构建收货数据
    receive_items = []
    for item in asn_data['items']:
        # 如果有包装层级信息，使用多层级收货逻辑
        if 'storage_unit' in asn_data and asn_data['storage_unit']:
            hierarchy_items = _process_packing_hierarchy(asn_data, item, properties)
            receive_items.extend(hierarchy_items)
        else:
            # 普通收货
            receive_items.append(_build_receive_item(asn_data, item, properties))

    # 对每个收货项单独发送请求
    success_count = 0
    for item in receive_items:
        result = _send_single_receive_request(base_url, login, item)
        if result:
            success_count += 1

    if success_count == len(receive_items):
        print("多层级批量收货成功")
        return {"status": "success", "message": "多层级批量收货成功"}
    else:
        error_msg = f"多层级批量收货部分失败：成功 {success_count}/{len(receive_items)}"
        print(error_msg)
        return {"status": "error", "message": error_msg}


def _send_single_receive_request(base_url, login, receive_item):
    """
    发送单个收货请求

    参数:
    base_url: 基础URL
    login: 登录信息
    receive_item: 收货项

    返回:
    是否成功
    """
    url = f"{base_url}/opt/asn/receive/ajax/submit"

    # 构建请求数据

    payload = receive_item
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token'],
        'Cookie': f"XSRF-TOKEN={login['cookies']['XSRF-TOKEN']}; laravel_session={login['cookies']['laravel_session']}"
    }

    try:
        print(payload)
        response = requests.post(url, headers=headers, data=payload)
        response_data = response.json()

        if response_data.get("status") == 0:
            print(f"收货成功: {receive_item['qty']}个 ({receive_item['storage_unit']})")
            return True
        else:
            error_msg = f"收货失败：{response.text}"
            print(error_msg)
            return False

    except requests.exceptions.RequestException as e:
        error_msg = f"请求失败: {str(e)}"
        print(error_msg)
        return False
    except json.JSONDecodeError as e:
        error_msg = f"响应解析失败: {str(e)}"
        print(error_msg)
        return False


def _process_packing_hierarchy(asn_data, item, properties):
    """
    处理多层级包装逻辑

    参数:
    asn_data: ASN数据
    item: 商品数据
    properties: 配置属性

    返回:
    收货项列表
    """
    total_qty = item['qty']
    hierarchy = asn_data['storage_unit']

    # 按层级从高到低排序
    sorted_hierarchy = sorted(hierarchy, key=lambda x: int(x['unit_level']), reverse=True)

    # 计算每个层级相对于第一层的换算因子
    conversion_factors = {}

    # 先计算每个层级包含多少个第一层
    for level in sorted_hierarchy:
        unit_level = level['unit_level']
        qty_of_previous = int(level['qty_of_previous_level'])

        if unit_level == '3':  # 第三层
            # 找到第二层
            level_2 = next((l for l in hierarchy if l['unit_level'] == '2'), None)
            if level_2:
                # 第三层包含的第二层数量 × 第二层包含的第一层数量
                conversion_factors[unit_level] = qty_of_previous * int(level_2['qty_of_previous_level'])
            else:
                # 如果没有第二层，则第三层直接包含第一层
                conversion_factors[unit_level] = qty_of_previous
        elif unit_level == '2':  # 第二层
            # 第二层直接包含第一层
            conversion_factors[unit_level] = qty_of_previous
        else:
            # 第一层或其他未知层级
            conversion_factors[unit_level] = 1

    # 计算每个层级的收货数量
    remaining_qty = total_qty
    level_quantities = {}

    # 从最高层级开始计算
    for level in sorted_hierarchy:
        unit_level = level['unit_level']
        factor = conversion_factors[unit_level]

        if factor <= remaining_qty:
            level_quantities[unit_level] = remaining_qty // factor
            remaining_qty = remaining_qty % factor
        else:
            level_quantities[unit_level] = 0

    # 处理剩余数量（第一层）
    if remaining_qty > 0:
        level_quantities['1'] = remaining_qty

    # 构建收货项
    receive_items = []

    # 处理各层级收货项
    for level in sorted_hierarchy:
        unit_level = level['unit_level']
        qty = level_quantities.get(unit_level, 0)

        if qty > 0:
            receive_items.append(_build_hierarchy_receive_item(
                asn_data, item, properties, level, qty
            ))

    # 处理第一层收货项（如果有剩余）
    if '1' in level_quantities and level_quantities['1'] > 0:
        receive_items.append(_build_receive_item(asn_data, item, properties, level_quantities['1']))

    # 打印计算过程
    print(f"总数量: {total_qty}")
    for level in sorted_hierarchy:
        unit_level = level['unit_level']
        if unit_level in level_quantities and level_quantities[unit_level] > 0:
            print(f"第{unit_level}层: {level_quantities[unit_level]}个")
    if '1' in level_quantities and level_quantities['1'] > 0:
        print(f"第一层: {level_quantities['1']}个")

    return receive_items


def _build_hierarchy_receive_item(asn_data, item, properties, level, qty):
    """
    构建层级包装收货项

    参数:
    asn_data: ASN数据
    item: 商品数据
    properties: 配置属性
    level: 层级信息
    qty: 数量

    返回:
    收货项字典
    """
    unit_level = level['unit_level']

    # 根据层级确定存储单位
    if unit_level == '3':
        storage_unit = 'Carton'
    elif unit_level == '2':
        storage_unit = 'Suite'
    else:
        storage_unit = 'ea'

    # 使用商品原始条码
    return {
        "asn_number": asn_data['asn_number'],
        "po_number": item.get('po_number', ''),
        "centre_id": "37",
        "location": properties["location"],
        "expire_at": "",
        "manufacture_at": "",
        "batch": "",
        "udf_1": "",
        "udf_2": "",
        "udf_3": "",
        "qty": qty,
        "barcode": item['barcode'],  # 使用商品原始条码
        "serial_number": "",
        "condition": "GOOD",
        "pre_carton_qty": "1",
        "receiving_unit": "ea",
        "storage_unit": storage_unit  # 根据层级设置存储单位
    }


def _build_receive_item(asn_data, item, properties, qty=None):
    """
    构建普通收货项

    参数:
    asn_data: ASN数据
    item: 商品数据
    properties: 配置属性
    qty: 数量（可选，默认为商品数量）

    返回:
    收货项字典
    """
    if qty is None:
        qty = item['qty']

    return {
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
        "qty": qty,
        "barcode": item['barcode'],
        "barcode_type": "default",
        "serial_number": "",
        "condition": "GOOD",
        "pre_carton_qty": "1",
        "receiving_unit": "ea",
        "boxid": "",
        "storage_unit": "ea"  # 第一层使用"ea"
    }