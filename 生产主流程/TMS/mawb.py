import datetime
import json
import random
import time

import requests
import json
import datetime
import os


def create(token, properties):
    # 参数校验
    if not all([token, properties]):
        raise ValueError("Missing required parameters: token or properties")

    try:
        # 安全构建 URL
        base_url = properties['tms_url']
        endpoint = "/tms-saas-web/tms/oawb/add"
        url = base_url + endpoint

        # 读取订单数据 - 使用绝对路径更安全
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../生产主流程/data/'))
        file_path = os.path.join(data_dir, properties['order_txt'])

        with open(file_path, 'r', encoding='utf-8') as f:
            order_data = json.load(f)

        # 生成唯一主运单号
        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        mawb = f"TESTBACK{timestamp}"

        # 当前时间戳（ISO格式）
        current_time_iso = datetime.datetime.now().strftime('%Y-%m-%dT%H:%M:%S.00Z')

        # 准备航班段数据 - 提取为变量提高可读性
        flight_segments = [
            {
                "arriveCity": "BKK",
                "arriveDay": "",
                "arriveTime": current_time_iso,
                "companyId": 1,
                "createDatetime": 1624427465000,
                "createUserName": "哲盟用户",
                "departureRouteId": 308,
                "id": 966,
                "isdel": 0,
                "routeType": "2",
                "shipId": int(properties['ship_Id']),
                "startDay": "",
                "transportNo": "213",
                "transportType": "2",
                "startTime": current_time_iso
            },
            {
                "arriveCity": "BKK",
                "arriveDay": "",
                "arriveTime": current_time_iso,
                "companyId": 1,
                "createDatetime": 1624427465000,
                "createUserName": "哲盟用户",
                "departureRouteId": 308,
                "id": 967,
                "isdel": 0,
                "routeType": "3",
                "shipId": int(properties['ship_Id']),
                "startDay": "",
                "transportNo": "213",
                "transportType": "1",
                "startTime": current_time_iso
            },
            {
                "arriveCity": "BKK",
                "arriveDay": "",
                "arriveTime": current_time_iso,
                "companyId": 1,
                "createDatetime": 1624427465000,
                "createUserName": "哲盟用户",
                "departureRouteId": 308,
                "id": 968,
                "isdel": 0,
                "routeType": "2",
                "shipId": int(properties['ship_Id']),
                "startDay": "",
                "transportNo": "213",
                "transportType": "2",
                "startTime": current_time_iso
            }
        ]

        # 准备请求负载
        payload = {
            "oawbNo": mawb,
            "departureRouteId": int(properties['departure_Route_Id']),
            "nextStatId": int(properties['next_Stat_Id']),
            "remark": "",
            "startCity": "NNG",
            "oawbState": "1",
            "outStatId": "1",
            "transportType": "1",
            "exCustomsClearanceArea": "000",
            "destIds": "",
            "destCode": order_data["receiver"]["country_code"],
            "oriCountry": order_data["sender"]["country_code"],
            "destPortCountryCode": order_data["receiver"]["country_code"],
            "flipRuleId": "238",
            "tdWeig": "0.000",
            "token": token,
            "shipListStr": json.dumps(flight_segments)  # 使用json.dumps确保正确序列化
        }

        headers = {'Content-Type': 'application/x-www-form-urlencoded'}

        # 发送请求（添加超时和SSL验证）
        response = requests.post(
            url,
            data=payload,
            headers=headers,
            timeout=15,
            verify=True  # 生产环境应启用SSL验证
        )
        response.raise_for_status()  # 检查HTTP状态码

        # 解析响应
        try:
            resp_data = response.json()
        except json.JSONDecodeError:
            raise ValueError(f"Invalid JSON response: {response.text[:200]}")

        # 验证响应结构
        if 'body' not in resp_data or 'id' not in resp_data.get('body', {}):
            raise ValueError(f"Unexpected response structure: {resp_data}")

        # 提取响应数据
        mawb_id = resp_data['body']['id']
        print(f"创建总运单成功 | 运单号: {mawb} | ID: {mawb_id}")

        return {
            "id": mawb_id,
            "mawb": mawb
        }

    except FileNotFoundError:
        print(f"订单文件未找到: {properties['order_txt']}")
        return None
    except json.JSONDecodeError as je:
        print(f"订单文件JSON解析错误: {str(je)}")
        return None
    except requests.exceptions.RequestException as re:
        print(f"网络请求异常: {str(re)}")
        return None
    except ValueError as ve:
        print(f"参数或响应错误: {str(ve)}")
        return None
    except Exception as e:
        print(f"创建总运单失败: {str(e)}")
        return None




def select_BoxId(box_num, token, properties):
    # 参数校验
    if not all([box_num, token, properties]):
        raise ValueError("Missing required parameters: box_num, token or properties")

    try:
        # 安全构建 URL
        base_url = properties['tms_url']
        endpoint = "/tms-saas-web/tms/oawb/bagging/list"
        url = base_url + endpoint

        # 获取当前时间
        current_time = datetime.datetime.now()
        time_str = current_time.strftime('%Y-%m-%d %H:%M')

        # 准备请求负载
        payload = {
            "codeType": "7",
            "code": box_num,
            "sdDateFirst": time_str,
            "sdDateLast": time_str,
            "nextStatId": "",
            "baggingState": 3,
            "posStatId": 1,
            "dataType": 7,
            "pageSize": 500,
            "currentPage": 1,
            "token": token
        }

        headers = {'Content-Type': 'application/x-www-form-urlencoded'}

        # 发送请求
        response = requests.post(
            url,
            data=payload,
            headers=headers,
            timeout=10,  # 添加超时控制
            verify=False  # 注意安全风险，生产环境应考虑SSL验证
        )
        response.raise_for_status()  # 检查HTTP状态码

        # 解析响应
        try:
            resp_data = response.json()
        except requests.exceptions.JSONDecodeError:
            raise ValueError(f"Invalid JSON response: {response.text[:200]}")

        # 验证响应结构
        if not isinstance(resp_data.get('body'), dict) or not isinstance(resp_data['body'].get('list'), list):
            error_msg = resp_data.get('message', 'Unknown error')
            raise ValueError(f"Unexpected response structure: {error_msg}")

        # 检查结果列表
        if not resp_data['body']['list']:
            print(f"未找到箱号: {box_num} | 响应: {response.text[:200]}")
            return None

        # 返回第一个结果
        box_id = resp_data['body']['list'][0].get('id')
        if not box_id:
            print(f"找到箱号但缺少ID: {box_num} | 响应: {response.text[:200]}")
            return None

        print(f"成功获取箱号ID | 箱号: {box_num} | ID: {box_id}")
        return box_id

    except requests.exceptions.RequestException as e:
        print(f"网络请求异常 | 箱号: {box_num} | 错误: {str(e)}")
        return None
    except ValueError as ve:
        print(f"参数或响应错误 | 箱号: {box_num} | 错误: {str(ve)}")
        return None
    except Exception as e:
        print(f"获取箱号ID失败 | 箱号: {box_num} | 错误: {str(e)}")
        return None



def scan_box(box_num, mawb, mawb_id, token, properties, max_retries=3, retry_delay=2):
    """
    扫描箱子并关联到主运单

    参数:
        box_num: 箱号
        mawb: 主运单号
        mawb_id: 主运单ID
        token: 认证令牌
        properties: 配置属性
        max_retries: 最大重试次数
        retry_delay: 重试延迟(秒)

    返回:
        bool: 扫描是否成功
    """
    # 参数校验
    if not all([box_num, mawb, mawb_id, token, properties]):
        print("扫描箱子失败 | 错误: 缺少必要参数")
        return False

    attempt = 0
    while attempt < max_retries:
        attempt += 1
        try:
            # 安全构建 URL
            base_url = properties['tms_url']
            endpoint = "/tms-saas-web/tms/oawb/selbagging/selectBagging"
            url = base_url + endpoint

            # 获取箱号ID
            box_id = select_BoxId(box_num, token, properties)
            if not box_id:
                raise ValueError(f"无法获取箱号ID: {box_num}")

            # 准备请求负载
            payload = {
                "id": mawb_id,
                "oawbNo": mawb,
                "baggingIdList": box_id,
                "scanStatId": "1",
                "baggingStatId": "1",
                "dataType": "7",
                "token": token
            }

            headers = {'Content-Type': 'application/x-www-form-urlencoded'}

            # 发送请求
            response = requests.post(
                url,
                data=payload,
                headers=headers,
                timeout=10,  # 添加超时控制
                verify=False  # 注意安全风险，生产环境应考虑SSL验证
            )
            response.raise_for_status()  # 检查HTTP状态码

            # 解析响应
            try:
                resp_data = response.json()
            except requests.exceptions.JSONDecodeError:
                raise ValueError(f"无效的JSON响应: {response.text[:200]}")

            # 验证响应结构
            if not isinstance(resp_data.get('body'), dict):
                error_msg = resp_data.get('message', '未知错误')
                raise ValueError(f"响应结构异常: {error_msg}")

            # 检查扫描结果
            if resp_data['body'].get('baggingIdList'):
                print(f"扫描箱子成功 | 箱号: {box_num} | 运单: {mawb}")
                return True
            else:
                # 如果扫描失败但API没有返回错误，可能是系统延迟
                if attempt < max_retries:
                    print(f"扫描未成功 (尝试 {attempt}/{max_retries}) | 等待 {retry_delay}秒后重试...")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise ValueError(f"扫描失败: {resp_data.get('message', '未知原因')}")

        except requests.exceptions.RequestException as e:
            if attempt < max_retries:
                print(f"网络请求异常 (尝试 {attempt}/{max_retries}) | 等待 {retry_delay}秒后重试...")
                time.sleep(retry_delay)
            else:
                print(f"扫描箱子失败 | 箱号: {box_num} | 错误: 网络请求异常 - {str(e)}")
                return False
        except ValueError as ve:
            if attempt < max_retries:
                print(f"操作异常 (尝试 {attempt}/{max_retries}) | 等待 {retry_delay}秒后重试...")
                time.sleep(retry_delay)
            else:
                print(f"扫描箱子失败 | 箱号: {box_num} | 错误: {str(ve)}")
                return False
        except Exception as e:
            print(f"扫描箱子失败 | 箱号: {box_num} | 错误: 未处理的异常 - {str(e)}")
            return False

    # 所有重试都失败
    print(f"扫描箱子失败 | 箱号: {box_num} | 错误: 超过最大重试次数")
    return False


import requests
import json
import os
from urllib.parse import urljoin


def close_mawb(mawb, mawb_id, token, properties):
    """
    关闭主运单

    参数:
        mawb: 主运单号
        mawb_id: 主运单ID
        token: 认证令牌
        properties: 配置属性

    返回:
        bool: 操作是否成功
    """
    # 参数校验
    if not all([mawb, mawb_id, token, properties]):
        print("关闭主运单失败 | 错误: 缺少必要参数")
        return False

    try:
        # 安全构建 URL
        base_url = properties['tms_url'].rstrip('/')
        endpoint = "/tms-saas-web/tms/oawbtrack/dtl/add"
        url = base_url + endpoint

        # 读取订单数据 - 使用绝对路径避免相对路径问题
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.abspath(os.path.join(script_dir, '../../生产主流程/data/'))
        file_path = os.path.join(data_dir, properties['order_txt'])

        with open(file_path, 'r', encoding='utf-8') as f:
            order_data = json.load(f)
        # 准备航班段数据
        ship_data = [
            {
                "arriveCity": "gz",
                "arriveTime": 1630936774000,
                "companyId": 1,
                "createDatetime": 1630907974000,
                "createUserName": "哲盟用户",
                "id": 5444,
                "isdel": 0,
                "oawbId": 2942,
                "routeType": "2",
                "shipId": int(properties['ship_Id']),
                "startTime": 1630936774000,
                "transportNo": "213",
                "transportType": "2"
            },
            {
                "arriveCity": "cs",
                "arriveTime": 1630936774000,
                "companyId": 1,
                "createDatetime": 1630907974000,
                "createUserName": "哲盟用户",
                "id": 5445,
                "isdel": 0,
                "oawbId": 2942,
                "routeType": "3",
                "shipId": int(properties['ship_Id']),
                "startTime": 1630936774000,
                "transportNo": "213",
                "transportType": "1"
            },
            {
                "arriveCity": "ws",
                "arriveTime": 1630936774000,
                "companyId": 1,
                "createDatetime": 1630907974000,
                "createUserName": "哲盟用户",
                "id": 5446,
                "isdel": 0,
                "oawbId": 2942,
                "routeType": "2",
                "shipId": int(properties['ship_Id']),
                "startTime": 1630936774000,
                "transportNo": "213",
                "transportType": "2"
            }
        ]
        mawbNo1 = "123-"+ str(random.randint(11111111,99999999))
        # 准备请求负载
        payload = {
            "autoConfirm": 0,
            "departureRouteName": "测试11",
            "destCode": order_data["receiver"]["country_code"],
            "flipRuleId": "238",
            "hubOutIdList": "",
            "id": mawb_id,
            "nextStation": "广州分部",
            "oawbNo": mawb,
            "outActual": 5.3,
            "exCustomsClearanceArea": "000",
            "outPcs": 0,
            "remark": "",
            "scanEr": 0,
            "scanSc": 0,
            "startCity": "sz",
            "tdActual": 11,
            "tdPcs": 10,
            "tdVol": 12,
            "tdWeig": 12,
            "totalActual": 3.6,
            "totalBagPcs": 1,
            "totalCount": "3",
            "totalPcs": "3",
            "transportType": "1",
            "mawbNo1": mawbNo1,  # 确保mawb是数字类型
            "oawbState": 3,
            "token": token,
            "oawbShipStr": json.dumps(ship_data)  # 正确序列化JSON
        }

        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        # 发送请求
        response = requests.post(
            url,
            data=payload,
            headers=headers,
            timeout=15,
            verify=False  # 生产环境应启用SSL验证
        )
        # 处理响应
        try:
            resp_data = response.json()
        except json.JSONDecodeError:
            print(f"关闭主运单失败 | 总运单: {mawb} | 错误: 无效的JSON响应")
            print(f"响应内容: {response.text[:500]}")
            return False

        # 检查响应状态
        if resp_data.get('result_code') == 0:
            print(f"总运单确认成功 | 总运单: {mawb} | 提单: {mawbNo1}")
            return True
        else:
            error_msg = resp_data.get('message', '未知错误')
            print(f"关闭主运单失败 | 总运单: {mawb} | 错误: {error_msg}")
            return False

    except FileNotFoundError:
        print(f"关闭主运单失败 | 订单文件未找到: {file_path}")
        return False
    except json.JSONDecodeError as je:
        print(f"关闭主运单失败 | 订单文件JSON解析错误: {str(je)}")
        return False
    except KeyError as ke:
        print(f"关闭主运单失败 | 配置缺少必要参数: {str(ke)}")
        return False
    except requests.exceptions.RequestException as re:
        print(f"关闭主运单失败 | 网络请求异常: {str(re)}")
        return False
    except Exception as e:
        print(f"关闭主运单失败 | 未处理的异常: {str(e)}")
        return False
