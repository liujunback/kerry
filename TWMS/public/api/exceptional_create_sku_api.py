import datetime
import random
import requests
import json
import logging
from typing import Dict, Any, Union, List, Optional

# 配置日志


def exceptional_create_sku(properties: Dict[str, Any]) -> Dict[str, Any]:
    """
    创建SKU的方法（优化版）

    参数:
    properties (dict): 配置字典，必须包含:
        - "TWMS_URL": API基础URL
        - "api_token": API认证token
        - "sku_data": SKU数据文件路径
    max_retries (int): 最大重试次数，默认为3

    返回:
    dict: API响应结果或错误信息
    """
    session = requests.Session()
    # 验证必要配置
    required_keys = ["TWMS_URL", "api_token", "sku_data"]
    if missing := [key for key in required_keys if key not in properties]:
        error_msg = f"缺少必要配置项: {', '.join(missing)}"
        print(error_msg)
        return {"error": error_msg, "status": "config_error"}

    # 准备基础配置
    base_url = properties["TWMS_URL"].rstrip('/')
    api_token = properties["api_token"]
    sku_data_path = properties["sku_data"]
    try:
        with open(f"../../TWMS/data/{sku_data_path}", 'r', encoding='utf-8') as f:
            sku_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        error_msg = f"加载SKU模板失败: {str(e)}"
        print(error_msg)
        return {"error": error_msg, "status": "template_error"}
    url = f"{base_url}/api/sku"

    # 使用已存在的SKU编码（假设已存在）
    existing_sku_code = "TRSKU2025092501"
    sku_data["sku_list"][0]["code"] = existing_sku_code
    payload = sku_data
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_token}'
    }
    response = session.post(url, json=payload, headers=headers)
    return response
    # 验证响应


