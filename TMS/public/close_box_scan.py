import json
import requests
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from TMS.public.Controller_Login import Controller_Login


def create_retry_session(max_retries=3):
    """创建带重试机制的session"""
    session = requests.Session()

    # 设置重试策略
    retry_strategy = Retry(
        total=max_retries,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"]
    )

    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    return session


def close_Box_Scan(tracking_number, box_num="", max_retries=3):
    token = Controller_Login()
    url = "https://ops-eng-uat.kec-app.com/controller/pss/manual/closeBoxScan"

    payload = {
        "trackingNumber": tracking_number,
        "boxNumber": box_num,
        "isReferenceNumber": 0,
        "code": "back"
    }

    headers = {
        'token': token,
        'Authorization': token,
        'Content-Type': 'application/json'
    }

    session = create_retry_session(max_retries)

    for attempt in range(max_retries + 1):  # 总尝试次数 = 重试次数 + 1
        try:
            print(f"尝试关闭箱扫描 (尝试 {attempt + 1}/{max_retries + 1})...")
            response = session.post(
                url,
                headers=headers,
                data=json.dumps(payload),
                timeout=30,  # 设置超时
                verify=False  # 跳过SSL验证
            )

            if response.status_code == 200:
                response_data = response.json()
                if response_data["code"] == 200:
                    box_number = response_data["data"]["info"]["boxNumber"]
                    print("Box_num: " + box_number)
                    return box_number
                else:
                    print(f"API返回错误: {response.text}")
                    # 如果是业务逻辑错误，不需要重试
                    break
            else:
                print(f"HTTP请求失败，状态码: {response.status_code}")
                print(response.text)

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            print(f"连接错误 (尝试 {attempt + 1}/{max_retries + 1}): {e}")
            if attempt < max_retries:
                wait_time = 2 ** attempt  # 指数退避
                print(f"等待 {wait_time} 秒后重试...")
                time.sleep(wait_time)
            else:
                print("所有重试都失败")
                break

        except Exception as e:
            print(f"未知错误: {e}")
            break

    # 如果所有尝试都失败，返回空字符串或抛出异常
    return ""
def close_Box(box_num,tracking_num):
    url = "https://ops-eng-uat.kec-app.com/controller/pss/manual/closeBox"
    token = Controller_Login()
    payload={
        "trackingNumbers":tracking_num,
        "isReferenceNumber":0,
        "boxNumber":box_num,
        "code":"BAFYL"
    }
    headers = {
      'Authorization': token,
      'token': token,
      'Content-Type': 'application/json'
    }

    response = requests.request("POST", url, headers=headers, data=json.dumps(payload))
    if json.loads(response.text)["code"] == 200:
        print("关箱成功")
    else:

        print(response.text)
