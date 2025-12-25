import requests
import json
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def Controller_Login(max_retries=3, backoff_factor=1):
    """
    登录控制器系统

    Args:
        max_retries (int): 最大重试次数
        backoff_factor (float): 重试间隔因子

    Returns:
        str: 登录成功返回token，失败返回None
    """
    data = {
        "userNo": "kec064",
        "password": "123465"
    }
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    # 创建Session并配置重试策略
    session = requests.Session()

    # 设置重试策略
    retry_strategy = Retry(
        total=max_retries,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "POST", "PUT", "DELETE", "OPTIONS", "TRACE"],
        backoff_factor=backoff_factor
    )

    # 创建适配器并挂载到session
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    url = "https://ops-eng-uat.kec-app.com/controller/account/tms/login"

    for attempt in range(max_retries + 1):
        try:
            # print(f"尝试第 {attempt + 1} 次连接...")

            response = session.post(
                url,
                data=json.dumps(data),
                headers=headers,
                timeout=30,  # 设置超时时间
                verify=True  # 验证SSL证书
            )

            # 检查HTTP状态码
            response.raise_for_status()

            # 解析响应
            result = response.json()

            if result.get("code") == 200:
                token = result["data"]["token"]
                # print("登录成功！")
                return token
            else:
                print(f"登录失败: {result}")
                return None

        except requests.exceptions.ConnectionError as e:
            print(f"连接错误 (尝试 {attempt + 1}/{max_retries + 1}): {e}")
            if attempt < max_retries:
                wait_time = backoff_factor * (2 ** attempt)  # 指数退避
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                print("达到最大重试次数，连接失败")
                return None

        except requests.exceptions.Timeout as e:
            print(f"请求超时 (尝试 {attempt + 1}/{max_retries + 1}): {e}")
            if attempt < max_retries:
                wait_time = backoff_factor * (2 ** attempt)
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                print("达到最大重试次数，请求超时")
                return None

        except requests.exceptions.HTTPError as e:
            print(f"HTTP错误: {e}")
            print(f"状态码: {response.status_code}")
            return None

        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {e}")
            print(f"响应内容: {response.text}")
            return None

        except Exception as e:
            print(f"未知错误: {e}")
            return None

    return None