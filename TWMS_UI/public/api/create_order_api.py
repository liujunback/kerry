import datetime
import random
import requests
import json
import logging
import time
from typing import Dict, Any, Union, List, Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('Order_Creator')


def create_order_api(properties: Dict[str, Any], skus,max_retries: int = 3) -> Dict[str, Any]:
    """
    创建订单的方法（优化版）

    参数:
    properties (dict): 配置字典，必须包含:
        - "TWMS_URL": API基础URL
        - "api_token": API认证token
        - "cookie": API认证cookie
    max_retries (int): 最大重试次数，默认为3

    返回:
    dict: API响应结果或错误信息
    """
    # 验证必要配置
    required_keys = ["TWMS_URL", "api_token", "cookie"]
    if missing := [key for key in required_keys if key not in properties]:
        error_msg = f"缺少必要配置项: {', '.join(missing)}"
        logger.error(error_msg)
        return {"error": error_msg, "status": "config_error"}

    # 准备基础配置
    base_url = properties["TWMS_URL"].rstrip('/')
    api_token = properties["api_token"]
    cookie = properties["cookie"]

    # 生成唯一订单号
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    random_suffix = str(random.randint(1000, 9999))
    order_number = f"BACKOR{timestamp}{random_suffix}"

    # 构建订单数据
    order_data = {
        "centre_code": "FT",
        "inventory_validation": False,
        "client_code": "FOMSTEST",
        "callback_foms_required": False,
        "logistics_provider": {"code": "SELFPICK"},
        "package": {
            "order_number": order_number,
            "is_block": 0,
            "platform_order_id": order_number,
            "declared_value": 5000,
            "declared_value_currency": "THB",
            "shipment_term": "DDP",
            "payment_method": "PP",
            "cod_value_currency": "THB",
            "remarks": f"REMARK-{random_suffix}"
        },
        "sender": {
            "name": "backtest",
            "address": "深圳金融科技创新中心",
            "city": "SZ",
            "province": "广东",
            "country_code": "CN",
            "district": "test city",
            "post_code": "21999",
            "phone": "1234567890",
            "email": "123123123@qq.com"
        },
        "receiver": {
            "name": "TEST TESTY",
            "address": "test2 address",
            "city": "San Francisco",
            "province": "Hong Kong",
            "country_code": "HK",
            "post_code": "80226",
            "phone": "1234567891",
            "email": "123@abn.com",
            "company": "test 32546",
            "district": "The Peak"
        },
        "items": []
    }
    for i in skus:
        order_data["items"].append(
            {
                "sku": i,
                "description": "Cycliq Micro SD",
                "unit_price": 2000,
                "currency": "THB",
                "qty": 2,
                "condition": "GOOD"
            }
        )


    # 准备API请求
    url = f"{base_url}/foms/api/order"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_token}',
        'Cookie': cookie
    }

    # 构建请求体
    payload = json.dumps(order_data, ensure_ascii=False)

    # 带重试机制的请求
    for attempt in range(max_retries):
        try:
            logger.info(f"创建订单请求中 (尝试 {attempt + 1}/{max_retries}): {order_number}")
            response = requests.post(
                url,
                headers=headers,
                data=payload,
                timeout=15
            )
            response.raise_for_status()

            # 尝试解析JSON响应
            try:
                result = response.json()
                logger.info(f"成功创建订单: {order_number}")
                return {
                    "status": "success",
                    "order_number": order_number,
                    "response": result
                }
            except json.JSONDecodeError:
                logger.warning(f"响应不是有效的JSON: {response.text}")
                return {
                    "status": "success",
                    "order_number": order_number,
                    "raw_response": response.text
                }

        except requests.exceptions.HTTPError as http_err:
            status_code = response.status_code if 'response' in locals() else None
            error_detail = response.text if 'response' in locals() else str(http_err)

            # 特定错误处理
            if status_code == 401:
                logger.error("认证失败: 无效的API Token")
                return {
                    "error": "认证失败",
                    "status": "auth_error",
                    "status_code": 401
                }

            logger.warning(f"HTTP错误 (尝试 {attempt + 1}/{max_retries}): {status_code} - {error_detail}")

        except (requests.exceptions.RequestException, TimeoutError) as req_err:
            logger.warning(f"网络错误 (尝试 {attempt + 1}/{max_retries}): {str(req_err)}")

        # 指数退避重试
        if attempt < max_retries - 1:
            sleep_time = 2 ** attempt
            logger.info(f"将在 {sleep_time} 秒后重试...")
            time.sleep(sleep_time)

    # 所有重试失败
    error_msg = f"创建订单失败: {order_number} (尝试 {max_retries} 次后)"
    logger.error(error_msg)
    return {
        "error": error_msg,
        "status": "failed",
        "order_number": order_number
    }

