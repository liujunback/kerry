import time

import requests
import datetime
import json
from typing import Dict, Optional


def shipment_add(properties: Dict[str, str], token: str, max_retries: int = 3) -> Optional[str]:
    """
    创建出货批次

    :param properties: 配置属性字典
    :param token: 认证token
    :param max_retries: 最大重试次数
    :return: 出货批次号（失败时返回None）
    """
    base_url = properties['tms_url']
    endpoint = "tms-saas-web/tms/outbound/add"
    url = base_url + endpoint

    # 生成唯一出货批次号
    timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
    shipment_num = f"TESTBACK-{timestamp}"

    # 准备请求数据
    payload = {
        "shipmentbatchNo": shipment_num,
        "shipmentbatchStrategy": int(properties.get('shipment_batch_Strategy', 0)),
        "shipmentStatid": int(properties.get('shipment_Stat_id', 0)),
        "remark": "",
        "deliveryAgent": properties.get('delivery_Agent', ''),
        "deliveryDriver": "back",
        "deliveryDriverPhone": "1234567",
        "deliveryDriverCarno": "",
        "companyId": 1,
        "id": 92,
        "outActual": 0,
        "verifyType": 1,
        "token": token  # 注意：这可能与header中的token重复，建议确认是否需要
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": token  # 确保使用标准认证头
    }

    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                data=payload,
                headers=headers,
                verify=False,
                timeout=10
            )

            # 检查HTTP状态码
            response.raise_for_status()

            # 解析JSON响应
            response_data = response.json()

            # 检查业务状态
            if response_data.get('result_code') == 0:
                print(f"✅ 出货批次创建成功: {shipment_num}")
                return shipment_num
            else:
                error_msg = response_data.get('message') or response.text
                print(f"❌ 出货批次创建失败 | 错误信息: {error_msg}")
                # 返回None表示失败
                return None

        except requests.exceptions.RequestException as e:
            print(f"⚠️ 请求异常 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                # 指数退避策略
                time.sleep(2 ** attempt)
            else:
                print(f"❌ 出货批次创建最终失败: {str(e)}")
                return None
        except json.JSONDecodeError:
            print(f"❌ 响应解析失败 | 原始响应: {response.text[:200]}...")
            return None


def shipment_num_ids(
        shipment_num: str,
        properties: Dict[str, str],
        token: str,
        max_retries: int = 3
) -> Optional[int]:
    """
    根据出货批次号获取对应的ID

    :param shipment_num: 出货批次号
    :param properties: 配置属性字典
    :param token: 认证token
    :param max_retries: 最大重试次数
    :return: 出货批次ID（失败时返回None）
    """
    base_url = properties['tms_url']
    endpoint = "/tms-saas-web/tms/outbound/list"
    url = base_url + endpoint

    payload = {
        "shipmentbatchDatetime": "",
        "shipmentStatid": int(properties.get('shipment_Stat_id', 0)),
        "shipmentbatchStrategy": "",
        "deliveryAgent": "",
        "shipmentbatchStatus": 0,
        "deliveryAgentStr": "",
        "stDateStart": "",
        "stDateEnd": "",
        "codeType": 84,
        "noStr": shipment_num,
        "pageSize": 50,
        "currentPage": 1,
        "token": token
    }

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": token  # 添加标准认证头
    }

    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                data=payload,
                headers=headers,
                verify=False,  # 添加verify=False以匹配原始函数
                timeout=10
            )

            # 检查HTTP状态码
            response.raise_for_status()

            response_data = response.json()

            # 检查响应结构
            if 'body' not in response_data or 'footer' not in response_data['body']:
                print(f"❌ 响应格式异常: {response.text[:200]}...")
                return None

            footer = response_data['body']['footer']
            if not footer or len(footer) == 0:
                print(f"❌ 未找到批次统计信息: {shipment_num}")
                return None

            count = footer[0].get('count', 0)

            if count == 1:
                # 确保list存在且有元素
                if 'list' in response_data['body'] and len(response_data['body']['list']) > 0:
                    batch_id = response_data['body']['list'][0].get('id')
                    if batch_id:
                        print(f"✅ 获取批次ID成功 | 批次号: {shipment_num} | ID: {batch_id}")
                        return batch_id
                    else:
                        print(f"❌ 批次ID字段缺失: {response.text[:200]}...")
                        return None
                else:
                    print(f"❌ 批次列表为空: {shipment_num}")
                    return None
            else:
                print(f"❌ 查询到{count}条记录，预期1条 | 批次号: {shipment_num}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"⚠️ 请求异常 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                # 指数退避策略
                time.sleep(2 ** attempt)
            else:
                print(f"❌ 获取批次ID最终失败: {str(e)}")
                return None
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            print(f"❌ 响应解析失败: {str(e)} | 原始响应: {response.text[:200]}...")
            return None


def shipment_scan(box_num, shipment_num, properties, token):
    # 基础参数校验
    if not all([box_num, shipment_num, properties, token]):
        raise ValueError("Missing required parameters")

    try:
        # 安全构建 URL
        base_url = properties['tms_url']
        endpoint = "/tms-saas-web/tms/outbound/scan"
        url = base_url + endpoint

        # 获取出货批次 ID
        shipmentbatchId = shipment_num_ids(shipment_num, properties, token)

        payload = {
            "shipmentbatchId": shipmentbatchId,
            "shipmentbatchNo": shipment_num,
            "baggingno": box_num,
            "scanStatId": int(properties['shipment_Stat_id']),
            "token": token
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        # 发送请求
        response = requests.post(url, data=payload, headers=headers, timeout=10)
        response.raise_for_status()  # 检查 HTTP 状态码

        # 尝试解析 JSON
        try:
            resp_json = response.json()
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON response: {response.text[:200]}")

        # 检查业务状态
        if resp_json.get('result_code') == 0:
            print(f"出货扫描成功 | 箱号: {box_num} | 批次: {shipment_num}")
            return shipmentbatchId
        else:
            error_msg = resp_json.get('message', 'Unknown error')
            print(f"出货扫描失败 | 批次ID: {shipmentbatchId} | 错误: {error_msg}")
            return shipmentbatchId

    except requests.exceptions.RequestException as e:
        print(f"网络请求异常: {str(e)}")
        # 返回已获取的 shipmentbatchId 或根据业务需求处理
        return shipmentbatchId if 'shipmentbatchId' in locals() else None
    except ValueError as ve:
        print(f"参数错误: {str(ve)}")
        return None
    except Exception as e:
        print(f"未处理的异常: {str(e)}")
        return None



def shipment_close(shipmentbatchId, shipment_num, properties, token):
    # 参数校验
    if not all([shipmentbatchId, shipment_num, properties, token]):
        raise ValueError("Missing required parameters")

    try:
        # 安全构建 URL
        base_url = properties['tms_url']
        endpoint = "/tms-saas-web/tms/outbound/send"
        url = base_url + endpoint

        # 准备 payload
        payload = {
            "id": shipmentbatchId,
            "outActual": 2.7,  # 注意：硬编码值，考虑参数化
            "sendDatetime": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "isWTJFX": 0,  # 注意：硬编码值，考虑参数化
            "scanStatId": 1130,  # 注意：硬编码值，考虑参数化
            "scanStation": "虎门分拨",  # 注意：硬编码值，考虑参数化
            "token": token
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        # 发送请求
        response = requests.post(
            url,
            data=payload,
            headers=headers,
            timeout=10  # 添加超时
        )
        response.raise_for_status()  # 检查 HTTP 状态码

        # 解析响应
        try:
            resp_data = response.json()
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON response: {response.text[:200]}")

        # 检查业务状态
        if resp_data.get('result_code') == 0:
            print(f"出货成功 | 批次: {shipment_num} | ID: {shipmentbatchId}")
            return True
        else:
            error_msg = resp_data.get('message', 'Unknown error')
            error_details = resp_data.get('data', 'No additional details')
            print(f"出货失败 | 批次: {shipment_num} | 错误: {error_msg} | 详情: {error_details}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"网络请求异常 | 批次: {shipment_num} | 错误: {str(e)}")
        return False
    except ValueError as ve:
        print(f"参数错误 | 批次: {shipment_num} | 错误: {str(ve)}")
        return False
    except Exception as e:
        print(f"未处理的异常 | 批次: {shipment_num} | 错误: {str(e)}")
        return False