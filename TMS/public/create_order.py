import json
import random
import datetime
import requests
import time
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def create_session_with_retry():
    """创建带重试机制的session"""
    session = requests.Session()

    # 设置重试策略
    retry_strategy = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST"]  # 使用allowed_methods
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    return session


def file_create_order(token):
    header = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer " + token
    }

    try:
        with open("../file_data/order_data.txt", 'r', encoding='utf-8') as f:
            param2 = json.loads(f.read())
    except Exception as e:
        print(f"读取文件失败: {e}")
        return "失败"

    reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(
        random.randint(1, 300))
    param2['package']['reference_number'] = reference_number

    # 两个URL，优先使用第一个，如果失败再尝试第二个
    urls = [
        # "http://47.119.120.7:22900/pos-web/shipment/create",
        "https://pos-kec-eng-uat.kec-app.com/pos-web/shipment/create"
    ]

    session = create_session_with_retry()

    for url in urls:
        # print(f"尝试连接: {url}")
        try:
            time_start = time.time()
            response = session.post(
                url,
                data=json.dumps(param2),
                headers=header,
                timeout=(10, 30)  # 连接超时10秒，读取超时30秒
            )
            time_end = time.time()

            print(reference_number)
            print('下单耗时：', round(time_end - time_start, 2), 's')

            if response.status_code == 201:
                print(response.text)
                tracking_number = json.loads(response.text)["data"]["tracking_number"]
                print(f"追踪号码: {tracking_number}")
                return tracking_number
            else:
                print(f"请求失败，状态码: {response.status_code}")
                print(response.text)
                # 继续尝试下一个URL

        except requests.exceptions.ConnectionError as e:
            print(f"连接错误 ({url}): {e}")
            continue

        except requests.exceptions.Timeout as e:
            print(f"请求超时 ({url}): {e}")
            continue

        except Exception as e:
            print(f"其他错误 ({url}): {e}")
            continue

    # 所有URL都尝试失败
    print("所有服务器连接都失败")
    return "失败"


# 或者使用更简化的版本，只用一个URL但更好的错误处理
def file_create_order_simple(token):
    header = {
        'Content-Type': 'application/json',
        "Authorization": "Bearer " + token
    }

    try:
        with open("../file_data/order_data.txt", 'r', encoding='utf-8') as f:
            param2 = json.loads(f.read())
    except Exception as e:
        print(f"读取文件失败: {e}")
        return "失败"

    reference_number = "TESTBACK" + str((datetime.datetime.now()).strftime('%Y%m%d%H%M%S')) + str(
        random.randint(1, 300))
    param2['package']['reference_number'] = reference_number

    url = "https://pos-kec-eng-uat.kec-app.com/pos-web/shipment/create"

    # 创建session
    session = requests.Session()

    # 设置重试
    retries = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504])
    session.mount('https://', HTTPAdapter(max_retries=retries))

    try:
        time_start = time.time()
        response = session.post(
            url,
            json=param2,  # 使用json参数自动序列化并设置Content-Type
            headers=header,
            timeout=30,  # 总超时30秒
            verify=False  # 如果SSL证书有问题，可以暂时关闭验证（仅测试环境）
        )
        time_end = time.time()

        print(reference_number)
        print('下单耗时：', round(time_end - time_start, 2), 's')

        if response.status_code == 201:
            print(response.text)
            tracking_number = response.json()["data"]["tracking_number"]
            print(f"追踪号码: {tracking_number}")
            return tracking_number
        else:
            print(f"请求失败，状态码: {response.status_code}")
            print(response.text)
            return "失败"

    except requests.exceptions.ConnectionError as e:
        print(f"连接错误: {e}")
        print("请检查:")
        print("1. 网络连接是否正常")
        print("2. 目标服务器是否可访问")
        print("3. 防火墙设置")
        return "失败"

    except requests.exceptions.Timeout as e:
        print(f"请求超时: {e}")
        return "失败"

    except Exception as e:
        print(f"未知错误: {e}")
        return "失败"