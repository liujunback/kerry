import requests
import json


def inventory(properties, login, asn_data):
    """
    查询库存并核对ASN中的SKU和数量

    Args:
        properties: 配置属性字典
        login: 包含认证信息的字典（csrf_token和cookies）
        asn_data: ASN数据，包含SKU信息

    Returns:
        dict: 包含核对结果和详细信息的字典
    """
    # 构建URL
    base_url = properties.get('TWMS_URL', '').rstrip('/')
    url = f"{base_url}/opt/stock/processing/ajax/list"

    # 验证ASN数据
    if not asn_data or 'items' not in asn_data or not asn_data['items']:
        return {
            "success": False,
            "message": "错误: asn_data中没有有效的SKU信息",
            "details": {}
        }

    # 准备请求头
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login.get('csrf_token', ''),
        'Cookie': f"XSRF-TOKEN={login['cookies'].get('XSRF-TOKEN', '')}; laravel_session={login['cookies'].get('laravel_session', '')}",
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    }



    # 对ASN中的每个SKU进行查询和核对
    for item in asn_data['items']:
        sku_code = item.get('code', '')
        sku_barcode = item.get('barcode', '')
        expected_qty = item.get('qty', 0)

        # 准备请求数据
        payload = {
            "bin_code": "",
            "sku_code": sku_code,
            "sku_barcode": sku_barcode,
            "client_id": "",
            "centre_id": properties.get('centre_id', '37'),
            "box_number": ""
        }

        try:
            # 发送POST请求
            response = requests.post(url, data=payload, headers=headers, timeout=30)
            # 初始化结果字典
            result = {
                "success": True,
                "message": "所有SKU核对成功",
                "details": {},
                "asn_number": asn_data.get('asn_number', '未知ASN')
            }
            # 检查响应状态
            if response.status_code == 200:
                try:
                    response_data = response.json()

                    # 检查API响应是否成功
                    if response_data.get('code') != 200:
                        result["success"] = False
                        result["details"][sku_code] = {
                            "status": "error",
                            "message": f"API返回错误: {response_data.get('message', '未知错误')}",
                            "expected_qty": expected_qty,
                            "actual_qty": 0
                        }
                        continue

                    # 检查库存数据
                    inventory_data = response_data.get('data', [])
                    total_qty = 0

                    # 计算总库存数量
                    for inventory_item in inventory_data:
                        if (inventory_item.get('code') == sku_code or
                                inventory_item.get('barcode') == sku_barcode or
                                inventory_item.get('sku_code') == sku_code):
                            total_qty += int(inventory_item.get('qty', 0))

                    # 核对数量
                    if total_qty == expected_qty:
                        result["details"][sku_code] = {
                            "status": "success",
                            "message": f"库存充足: {total_qty} == {expected_qty}",
                            "expected_qty": expected_qty,
                            "actual_qty": total_qty
                        }
                    else:
                        result["success"] = False
                        result["message"] = "库存比对存在失败"
                        result["details"][sku_code] = {
                            "status": "insufficient",
                            "message": f"库存不一致: {total_qty} >< {expected_qty}",
                            "expected_qty": expected_qty,
                            "actual_qty": total_qty
                        }

                except ValueError:
                    result["success"] = False
                    result["details"][sku_code] = {
                        "status": "error",
                        "message": "响应不是有效的JSON格式",
                        "expected_qty": expected_qty,
                        "actual_qty": 0
                    }
            else:
                result["success"] = False
                result["details"][sku_code] = {
                    "status": "error",
                    "message": f"请求失败，状态码: {response.status_code}",
                    "expected_qty": expected_qty,
                    "actual_qty": 0
                }

        except requests.exceptions.RequestException as e:
            result["success"] = False
            result["details"][sku_code] = {
                "status": "error",
                "message": f"请求异常: {e}",
                "expected_qty": expected_qty,
                "actual_qty": 0
            }

    # 如果没有一个SKU成功查询，更新总体消息
    if not any(detail.get('status') == 'success' for detail in result["details"].values()):
        result["message"] = "所有SKU查询失败"

    return result