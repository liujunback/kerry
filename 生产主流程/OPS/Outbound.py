import json
import requests
from urllib.parse import urljoin
from requests.exceptions import RequestException


def Outbound_Scan(tracking_number, properties, token, box_num=""):
    """
    优化后的出库扫描操作函数

    参数:
        tracking_number: 包裹追踪号
        properties: 配置字典，包含:
            - ops_url: API基础URL
        token: 认证token
        box_num: 箱号（可选）

    返回:
        str: 箱号（操作成功时）或 None（操作失败时）
    """
    # 1. 验证必要参数
    required_keys = ['ops_url']
    if not all(key in properties for key in required_keys):
        missing = [key for key in required_keys if key not in properties]
        print(f"错误：缺少必要参数: {', '.join(missing)}")
        return None

    try:
        # 2. 安全构建URL
        base_url = properties['ops_url']
        endpoint = "/pss/manual/closeBoxScan"
        full_url = base_url + endpoint

        # 3. 准备请求数据
        payload = {
            "trackingNumber": tracking_number,
            "boxNumber": box_num,
            "isReferenceNumber": 0,
            "code": "BAFYL"
        }

        # 4. 准备请求头
        headers = {
            'Authorization': f"Bearer {token}",  # 使用标准Bearer认证格式
            'Content-Type': 'application/json'
        }

        # 5. 发送请求
        response = requests.post(
            full_url,
            json=payload,  # 使用json参数自动序列化
            headers=headers,
            verify=False,
            timeout=15  # 添加超时设置
        )

        # 6. 处理响应
        if response.status_code != 200:
            print(f"HTTP错误: 状态码 {response.status_code}, 响应内容: {response.text}")
            return None

        try:
            response_data = response.json()
        except json.JSONDecodeError:
            print(f"JSON解析错误, 原始响应: {response.text}")
            return None

        # 7. 检查业务状态码
        if response_data.get("code") == 200:
            # 安全获取箱号
            box_info = response_data.get("data", {}).get("info", {})
            result_box_num = box_info.get("boxNumber")

            if result_box_num:
                print(f"出库扫描成功！箱号: {result_box_num}")
                return result_box_num
            else:
                print("响应中缺少箱号信息")
                return None
        else:
            error_msg = response_data.get("msg", "未知错误")
            print(f"出库扫描失败: {error_msg} (状态码: {response_data.get('code', '未知')})")
            return None

    except RequestException as e:
        print(f"网络请求异常: {str(e)}")
        return None
    except Exception as e:
        print(f"未知错误: {str(e)}")
        return None