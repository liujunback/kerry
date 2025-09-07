import datetime
import random
import requests
import json
import logging
from typing import Dict, Any, Union, List, Optional

# 配置日志


def api_create_sku(properties: Dict[str, Any], max_retries: int = 3) -> Dict[str, Any]:
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

    # 加载SKU模板数据
    try:
        with open(f"../../TWMS/data/{sku_data_path}", 'r', encoding='utf-8') as f:
            sku_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        error_msg = f"加载SKU模板失败: {str(e)}"
        print(error_msg)
        return {"error": error_msg, "status": "template_error"}

    # 生成唯一SKU代码
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    random_suffix = str(random.randint(1000, 9999))  # 增加随机范围减少冲突
    sku_code = f"SKU{timestamp}{random_suffix}"

    # 更新SKU数据
    sku_data["code"] = sku_code
    sku_data["barcodes"][0] = sku_code

    # 准备API请求
    url = f"{base_url}/foms/api/sku"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_token}'
    }

    # 构建请求体 - 确保只包含有效的SKU数据
    payload = json.dumps({
        "sku_list": [{
            k: v for k, v in sku_data.items()
            if v not in (None, "", [])  # 过滤空值
        }]
    }, ensure_ascii=False)

    # 带重试机制的请求
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, data=payload, timeout=10)
            response.raise_for_status()

            # 尝试解析JSON响应
            try:
                result = response.json()
                print(f"成功创建SKU: {sku_code}")
                return {"sku":result["data"][0]["code"],
                        "sku_barcodes":result["data"][0]["barcodes"][0],
                        'sku_qty':2}
            except json.JSONDecodeError:
                print(f"响应不是有效的JSON: {response.text}")
                return {"raw_response": response.text, "status": "success"}

        except requests.exceptions.HTTPError as http_err:
            status_code = response.status_code if 'response' in locals() else None
            error_detail = response.text if 'response' in locals() else str(http_err)

            # 特定错误处理
            if status_code == 401:
                print("认证失败: 无效的API Token")
                return {"error": "认证失败", "status": "auth_error"}

            print(f"HTTP错误 (尝试 {attempt + 1}/{max_retries}): {status_code} - {error_detail}")

        except (requests.exceptions.RequestException, TimeoutError) as req_err:
            print(f"网络错误 (尝试 {attempt + 1}/{max_retries}): {str(req_err)}")

        # 指数退避重试
        if attempt < max_retries - 1:
            sleep_time = 2 ** attempt
            print(f"将在 {sleep_time} 秒后重试...")
            import time
            time.sleep(sleep_time)

    # 所有重试失败
    error_msg = f"创建SKU失败: {sku_code} (尝试 {max_retries} 次后)"
    print(error_msg)
    return {"error": error_msg, "status": "failed"}

