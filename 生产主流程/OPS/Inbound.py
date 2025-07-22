import json
import requests
from urllib.parse import urljoin
from requests.exceptions import RequestException


def OPS_Inbound(tracking_number, properties, token):
    """
    优化后的入库操作函数

    参数:
        tracking_number: 包裹追踪号
        properties: 配置字典，包含:
            - ops_url: API基础URL
        token: 认证token

    返回:
        bool: 操作是否成功
    """
    # 1. 验证必要参数
    required_keys = ['ops_url']
    if not all(key in properties for key in required_keys):
        missing = [key for key in required_keys if key not in properties]
        print(f"错误：缺少必要参数: {', '.join(missing)}")
        return False

    try:
        # 2. 安全构建URL
        base_url = properties['ops_url']
        endpoint = "/inbound/package/hand"
        full_url = base_url + endpoint

        # 3. 准备请求数据
        payload = {
            "token": token,
            "height": 140,
            "isPrint": 0,
            "isVol": 1,
            "length": 120,
            "trackingNumber": tracking_number,
            "width": 130,
            "weight": 1001
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
            return False

        try:
            response_data = response.json()
        except json.JSONDecodeError:
            print(f"JSON解析错误, 原始响应: {response.text}")
            return False

        # 7. 检查业务状态码
        if response_data.get("code") == 200:
            print(f"入库成功: {response_data.get('msg', '操作成功')}")
            return True
        else:
            error_msg = response_data.get("msg", "未知错误")
            print(f"入库失败: {error_msg} (状态码: {response_data.get('code', '未知')})")
            return False

    except RequestException as e:
        print(f"网络请求异常: {str(e)}")
        return False
    except Exception as e:
        print(f"未知错误: {str(e)}")
        return False