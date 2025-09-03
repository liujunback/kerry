import datetime
import random
import requests
import json
import logging
from typing import Dict, Any, Union, List, Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ASN_Creator')


def api_create_asn(properties: Dict[str, Any], sku_data: List[Dict[str, str]], max_retries: int = 3) -> Dict[str, Any]:
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
    # 验证必要配置
    required_keys = ["TWMS_URL", "api_token"]
    if missing := [key for key in required_keys if key not in properties]:
        error_msg = f"缺少必要配置项: {', '.join(missing)}"
        logger.error(error_msg)
        return {"error": error_msg, "status": "config_error"}

    # 准备基础配置
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
            logger.error(error_msg)
            return {"error": error_msg, "status": "template_error"}

    # 动态生成ASN编号（如果未提供）
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    random_suffix = str(random.randint(1000, 9999))
    asn_data["asn_number"] = f"ASN{timestamp}{random_suffix}"

    # 设置默认ASN日期（如果未提供）
    if "asn_date" not in asn_data or not asn_data["asn_date"]:
        asn_data["asn_date"] = datetime.datetime.now().strftime('%Y-%m-%d')

    # 确保必要字段有默认值
    asn_data.setdefault("centre_code", "FT")
    asn_data.setdefault("client_code", "FOMSTEST")
    asn_data.setdefault("is_return_asn", "N")

    # 处理传入的SKU信息
    asn_data["items"] = []

    # 遍历所有SKU数据并添加到items中
    for sku_info in [item for item in sku_data if item]:
        asn_data["items"].append({
            "code": sku_info["sku"],
            "barcode": sku_info["sku_barcodes"],  # 添加条码字段
            "unit_price": 5,
            "currency": "HKD",
            "qty": 10,
            "po_number": f"PO{timestamp}"  # 使用时间戳生成唯一的PO编号
        })

    # 验证items是否有效
    if "items" not in asn_data or not asn_data["items"]:
        error_msg = "ASN缺少有效的items数据"
        logger.error(error_msg)
        return {"error": error_msg, "status": "data_error"}

    # 准备API请求
    url = f"{base_url}/foms/api/asn"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_token}'
    }

    # 构建请求体 - 确保只包含有效数据
    payload = json.dumps({
        k: v for k, v in asn_data.items()
        if v not in (None, "", [])  # 过滤空值
    }, ensure_ascii=False)

    logger.debug(f"ASN请求数据: {payload}")

    # 带重试机制的请求
    for attempt in range(max_retries):
        try:
            response = requests.post(url, headers=headers, data=payload, timeout=15)
            response.raise_for_status()

            # 尝试解析JSON响应
            try:
                result = response.json()
                logger.info(f"成功创建ASN: {asn_data['asn_number']}")
                return {
                    "asn_number": asn_data['asn_number'],
                    "items": asn_data["items"]
                }
            except json.JSONDecodeError:
                logger.warning(f"响应不是有效的JSON: {response.text}")
                return {
                    "asn_number": asn_data['asn_number'],
                    "raw_response": response.text,
                    "status": "success"
                }

        except requests.exceptions.HTTPError as http_err:
            status_code = response.status_code if 'response' in locals() else None
            error_detail = response.text if 'response' in locals() else str(http_err)

            # 特定错误处理
            if status_code == 401:
                logger.error("认证失败: 无效的API Token")
                return {"error": "认证失败", "status": "auth_error"}
            elif status_code == 400:
                logger.warning(f"请求参数错误: {error_detail}")
                return {"error": "参数错误", "details": error_detail, "status": "bad_request"}

            logger.warning(f"HTTP错误 (尝试 {attempt + 1}/{max_retries}): {status_code} - {error_detail}")

        except (requests.exceptions.RequestException, TimeoutError) as req_err:
            logger.warning(f"网络错误 (尝试 {attempt + 1}/{max_retries}): {str(req_err)}")

        # 指数退避重试
        if attempt < max_retries - 1:
            sleep_time = 2 ** attempt
            logger.info(f"将在 {sleep_time} 秒后重试...")
            import time
            time.sleep(sleep_time)

    # 所有重试失败
    error_msg = f"创建ASN失败: {asn_data['asn_number']} (尝试 {max_retries} 次后)"
    logger.error(error_msg)
    return {"error": error_msg, "status": "failed"}
