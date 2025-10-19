import json
import random
import requests


def th_asn_serial_receive(properties, login, asn_data):
    """
    序列号收货函数 - 处理所有商品项，一次性提交多个序列号（换行分隔）

    参数:
    properties (dict): 配置字典
    login (dict): 登录信息
    asn_data (dict): ASN数据，包含多个商品信息和数量
    """
    base_url = properties['TWMS_URL'].rstrip('/')
    url = base_url + "/opt/asn/receive/ajax/submit"
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token'],
        'Cookie': f"XSRF-TOKEN={login['cookies']['XSRF-TOKEN']}; laravel_session={login['cookies']['laravel_session']}"
    }

    total_success_count = 0
    total_items_count = 0

    # 遍历所有商品项
    for item_index, item in enumerate(asn_data['items']):
        qty = item.get("qty", 1)
        total_items_count += qty

        print(f"处理商品 {item_index + 1}/{len(asn_data['items'])}: {item.get('code', '未知商品')}, 数量: {qty}")

        # 为当前商品生成指定数量的序列号
        serial_numbers = []
        for i in range(qty):
            # 生成唯一序列号，可以根据实际需求调整生成规则
            serial_number = f"TEST{random.randint(100000, 999999)}_{item_index + 1:02d}_{i + 1:03d}"
            serial_numbers.append(serial_number)

        # 将序列号列表转换为换行分隔的字符串
        serial_numbers_str = "\n".join(serial_numbers)

        # 一次性提交所有序列号（换行分隔）
        serial_data = {
            "asn_number": asn_data['asn_number'],
            "po_number": item["po_number"],
            "carton": "",
            "location": properties["location"],
            "expire_at": "",
            "manufacture_at": "",
            "batch": "",
            "udf_1": "",
            "udf_2": "",
            "udf_3": "",
            "qty": qty,  # 设置为序列号的数量
            "barcode": item['barcode'],
            "condition": "GOOD",
            "serial_number": serial_numbers_str  # 使用换行分隔的字符串
        }

        response = requests.post(url, headers=headers, data=serial_data)

        if response.json().get("status") == 0:
            print(f"  商品 {item.get('code', '未知商品')} 收货成功: {qty} 个序列号")
            total_success_count += qty
        else:
            print(f"  商品 {item.get('code', '未知商品')} 收货失败, 错误信息: {response.text}")

    # 输出总体汇总结果
    print(f"\n所有商品序列号收货完成: 总计成功 {total_success_count}/{total_items_count}")

    # 返回总体操作是否成功的布尔值
    return total_success_count == total_items_count