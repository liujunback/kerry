import json
import datetime
import requests

def status(tracking_number, statu, token, properties, message='test'):
    try:
        # 1. 获取运单数据
        manifest_data = manifestId(tracking_number, properties, token)
        if not manifest_data or "manifestId" not in manifest_data:
            print(f"运单数据获取失败: {tracking_number}")
            return False

        manifestid = manifest_data["manifestId"]
        scan_station = manifest_data.get("scanStation", "未知站点")  # 提供默认值

        # 2. 构建请求
        url = properties['tms_url'] + "/tms-saas-web/tms/manifesttrack/locus/add"
        payload = {
            "scanId": 508,
            "idList": manifestid,
            "scanName": message,
            "scanType": 1,
            "scanCode": statu,
            "scanDatetime": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "scanStation": scan_station,
            "remark": message,
            "isdefault": 0,
            "token": token
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        # 3. 发送请求
        response = requests.post(url, data=payload, headers=headers, timeout=10)
        response.raise_for_status()  # 检查HTTP状态码

        # 4. 处理响应
        response_data = response.json()
        if response_data.get("body") == 1:
            print(f"运单 {tracking_number} 状态补录成功")
            return True
        else:
            error_msg = response_data.get("msg") or response.text
            print(f"补录失败: {error_msg} | 请求参数: {payload}")
            return False

    except KeyError as e:
        print(f"配置参数缺失: {str(e)}")
    except requests.exceptions.RequestException as e:
        print(f"请求异常: {str(e)}")
    except json.JSONDecodeError:
        print(f"响应解析失败: {response.text}")
    except Exception as e:
        print(f"未预期错误: {str(e)}")

    return False


def manifestId(tracking_number, properties, token):
    try:
        # 构建URL并确保格式正确
        base_url = properties['tms_url'].rstrip('/')
        url = f"{base_url}/tms-saas-web/tms/manifestmanage/list"

        # 构造请求负载
        payload = {
            "no": tracking_number,
            "noType": 5,
            "pageSize": 1000,
            "currentPage": "1",
            "token": token,
            # 以下为默认参数，可根据实际需求调整
            "pcs": "",
            "createUserId": "",
            "date1": "0",
            "sdDates": "",
            "isWithStat": "0",
            "sdStatId": "",
            "custType": "",
            "hubInType": "",
            "businessType": "",
            "packType": "",
            "goodsType": "",
            "hubInList": "",
            "destId": "",
            "hubOutType": "",
            "hubOutId": "",
            "deliStatId": "",
            "inventoryType": "",
            "referenceno": "",
            "inventoryStrategyId": "",
            "iscChildCust": "0",
            "ccPayment": "",
            "iscodCharge": "0",
            "isrt": "0",
            "isrr": "0",
            "cocustomType": "",
            "oddNumbers": "",
            "saleEmpId": "",
            "merchandiserEmpId": "",
            "backno": "",
            "isCOD": 0,
            "custIdList": "",
            "hubInTypeList": "",
            "basScanStatusList": "",
            "hubTypeList": "",
            "sortCodeList": ""
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        # 发送请求并设置超时
        response = requests.post(url, data=payload, headers=headers, timeout=15)
        response.raise_for_status()  # 检查HTTP错误状态

        # 解析JSON响应
        response_data = response.json()

        # 验证响应结构
        if not isinstance(response_data, dict):
            print(f"API返回了无效的响应格式: {response.text}")
            return None

        body = response_data.get('body', {})
        manifest_list = body.get('list', [])

        # 检查是否获取到有效数据
        if not manifest_list:
            print(f"未找到运单信息: {tracking_number}")
            return None

        first_manifest = manifest_list[0]

        return {
            "manifestId": first_manifest["manifestId"],
            "scanStation": first_manifest.get("destName", "未知站点")  # 安全获取字段
        }

    except KeyError as e:
        print(f"响应数据缺少必要字段: {str(e)} | 响应: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"API请求失败: {str(e)} | URL: {url}")
    except json.JSONDecodeError:
        print(f"响应解析失败: {response.text}")
    except Exception as e:
        print(f"获取运单信息时发生未预期错误: {str(e)}")

    return None