import datetime
import random
import requests
import json
import logging
from typing import Dict, Any, Union, List, Optional

# 配置日志


def exceptional_api_create_asn(properties: Dict[str, Any], sku_data: List[Dict[str, str]], asn_number: str = "ASN202312121312",item_qty = 100) -> Dict[str, Any]:
    """
    创建ASN(Advanced Shipping Notice)的方法

    参数:
    properties (dict): 配置字典，必须包含:
        - "TWMS_URL": API基础URL
        - "api_token": API认证token
        - "asn_data": ASN数据字典或文件路径
    sku_data (list): 包含SKU信息的列表，每个元素是一个字典，包含sku和sku_barcodes
    max_retries (int): 最大重试次数，默认为3

    返回:
    dict: API响应结果或错误信息
    """
    session = requests.Session()
    base_url = properties["TWMS_URL"].rstrip('/')
    api_token = properties["api_token"]

    # 加载ASN数据
    asn_data = properties.get("asn_data", {})

    # 如果提供的是文件路径，则从文件加载
    if isinstance(asn_data, str):
        try:
            with open(f"../../TWMS/data/{asn_data}", 'r', encoding='utf-8') as f:
                asn_data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            error_msg = f"加载ASN模板失败: {str(e)}"
            print(error_msg)
            return {"error": error_msg, "status": "template_error"}

    random_suffix = str(random.randint(1000, 9999))
    asn_data["asn_number"] = asn_number
    asn_data["centre_code"] = properties["centre_code"]
    asn_data["client_code"] = properties["client_code"]

    # 设置默认ASN日期（如果未提供）
    if "asn_date" not in asn_data or not asn_data["asn_date"]:
        asn_data["asn_date"] = datetime.datetime.now().strftime('%Y-%m-%d')

    # 处理传入的SKU信息
    asn_data["items"] = []

    # 遍历所有SKU数据并添加到items中
    for sku_info in [item for item in sku_data if item]:
        asn_data["items"].append({
            "code": sku_info["sku"],
            "barcode": sku_info["sku_barcodes"],  # 添加条码字段
            "unit_price": 5,
            "currency": "HKD",
            "qty": item_qty,
            "po_number": "PO1231"  # 使用时间戳生成唯一的PO编号
        })
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_token}'
    }
    url = base_url +"/api/asn"
    response = session.post(url, json=asn_data,headers=headers)
    return response