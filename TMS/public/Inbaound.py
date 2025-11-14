import json
import requests
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from TMS.public.Controller_Login import Controller_Login


def create_retry_session():
    """创建带重试机制的session"""
    session = requests.Session()

    # 设置重试策略
    retry_strategy = Retry(
        total=3,  # 总重试次数
        backoff_factor=1,  # 退避因子
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"]
    )

    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    return session


def inbound(tracking_number):
    token = Controller_Login()
    url = "https://ops-eng-uat.kec-app.com/controller/inbound/package/hand"

    payload = {
        "token": token,
        "height": 100,
        "isPrint": 0,
        "isVol": 1,
        "length": 1000,
        "trackingNumber": tracking_number,
        "width": 300,
        "weight": 1100,
        "imgBase64": "",
        "isPreviewInput": 0
    }

    headers = {
        'Authorization': token,
        'Content-Type': 'application/json'
    }

    # 使用带重试的session
    session = create_retry_session()

    try:
        response = session.post(
            url,
            headers=headers,
            data=json.dumps(payload),
            timeout=30,  # 设置超时时间
            verify=False  # 如果SSL证书有问题，可以暂时关闭验证
        )

        if response.status_code == 200:
            response_data = response.json()
            if response_data.get("code") != 200:
                print(f"API返回错误: {response.text}")
            print(response_data.get("msg", "无返回消息"))
            return response_data
        else:
            print(f"HTTP请求失败，状态码: {response.status_code}")
            print(response.text)
            return None

    except requests.exceptions.ConnectionError as e:
        print(f"连接错误: {e}")
        print("请检查网络连接和目标服务器是否可访问")
        return None

    except requests.exceptions.Timeout as e:
        print(f"请求超时: {e}")
        return None

    except Exception as e:
        print(f"未知错误: {e}")
        return None


# 手动重试版本
def inbound_with_manual_retry(tracking_number, max_retries=3):
    token = Controller_Login()
    url = "https://ops-eng-uat.kec-app.com/controller/inbound/package/hand"

    payload = {
        "token": token,
        "height": 100,
        "isPrint": 0,
        "isVol": 1,
        "length": 1000,
        "trackingNumber": tracking_number,
        "width": 300,
        "weight": 1100,
        "imgBase64": "",
        "isPreviewInput": 0
    }

    headers = {
        'Authorization': token,
        'Content-Type': 'application/json'
    }

    for attempt in range(max_retries):
        try:
            print(f"尝试第 {attempt + 1} 次入库操作...")
            response = requests.post(
                url,
                headers=headers,
                data=json.dumps(payload),
                timeout=30,
                verify=False
            )

            if response.status_code == 200:
                response_data = response.json()
                if response_data.get("code") != 200:
                    print(f"API返回错误: {response.text}")
                print(response_data.get("msg", "无返回消息"))
                return response_data
            else:
                print(f"HTTP请求失败，状态码: {response.status_code}")
                print(response.text)

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            print(f"连接错误 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # 指数退避
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                print("所有重试都失败")
                return None

        except Exception as e:
            print(f"未知错误: {e}")
            return None

    return None
