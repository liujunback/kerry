import requests
import time
import json
import os


def send_inbound_event(tracking_number, event_timestamp=None):
    """
    发送入站事件请求

    Args:
        tracking_number: 运单号
        event_timestamp: 事件时间戳（毫秒），如果为None则使用当前时间
    """
    if event_timestamp is None:
        event_timestamp = int(time.time() * 1000)

    url = 'https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/conso/ops/event/inbound'

    headers = {
        'Content-Type': 'application/json'
    }

    data = {
        "event_at": event_timestamp,
        "height": 10,
        "length": 10,
        "sc_pickup_tn": tracking_number,
        "timezone": "+08:00",
        "weight": 2000,
        "width": 10
    }

    try:
        # 明确设置不使用代理
        session = requests.Session()
        session.trust_env = False  # 忽略系统代理设置

        response = session.post(
            url,
            headers=headers,
            json=data,
            timeout=30,
            verify=True  # 确保SSL验证开启
        )

        print(f"运单号: {tracking_number}")
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text}")

        # 尝试解析JSON响应
        try:
            json_response = response.json()
            print(f"JSON响应: {json.dumps(json_response, indent=2, ensure_ascii=False)}")
        except:
            pass

        print("-" * 50)

        return response

    except requests.exceptions.RequestException as e:
        print(f"请求失败 - 运单号: {tracking_number}, 错误: {e}")
        print("-" * 50)
        return None


def main():
    # 运单号列表
    tracking_numbers = [
        "YD110400917998101",
        "YD110400917998102",
        "YD10400917960102",
        "YD10400917963102",
        "YD10400917962102",
        "YD10400917963101",
        "YD10400917962101",
        "YD10400917960101",
        "YD5110400917944101",
        "YD5110400917942101",
        "YD5110400917942102",
        "YD5110400917939101",
        "YD5110400917941102",
        "YD5110400917941101",
        "YD5110400917939102",
        "YD5110400917944102"
    ]

    print(f"开始处理 {len(tracking_numbers)} 个运单号...")

    # 方案1: 所有请求使用相同的时间戳
    current_timestamp = int(time.time() * 1000)
    print(f"使用统一时间戳: {current_timestamp}")

    for i, tn in enumerate(tracking_numbers, 1):
        print(f"进度: {i}/{len(tracking_numbers)}")
        send_inbound_event(tn, current_timestamp)
        # 可选：添加延迟避免请求过于频繁
        time.sleep(0.5)

    print("所有运单请求处理完成！")


# 如果您仍然遇到代理问题，可以尝试以下替代方案
def send_without_proxy(tracking_number, event_timestamp=None):
    """
    完全绕过代理的设置
    """
    if event_timestamp is None:
        event_timestamp = int(time.time() * 1000)

    url = 'https://tms-kec-eng-uat.kec-app.com/tms-saas-web/tms/conso/ops/event/inbound'

    headers = {
        'Content-Type': 'application/json'
    }

    data = {
        "event_at": event_timestamp,
        "height": 10,
        "length": 10,
        "sc_pickup_tn": tracking_number,
        "timezone": "+08:00",
        "weight": 2000,
        "width": 10
    }

    try:
        # 方法1: 使用requests的proxies参数明确设置不使用代理
        response = requests.post(
            url,
            headers=headers,
            json=data,
            timeout=30,
            proxies={
                "http": None,
                "https": None,
            }
        )

        print(f"运单号: {tracking_number}")
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            print("请求成功!")
        else:
            print(f"响应内容: {response.text}")

        return response

    except requests.exceptions.RequestException as e:
        print(f"请求失败 - 运单号: {tracking_number}, 错误: {e}")
        return None


def alternative_main():
    """
    使用替代方法处理代理问题
    """
    tracking_numbers = [
        "YD110400917998101",
        "YD110400917998102",
        "YD10400917960102",
        "YD10400917963102",
        "YD10400917962102",
        "YD10400917963101",
        "YD10400917962101",
        "YD10400917960101",
        "YD5110400917944101",
        "YD5110400917942101",
        "YD5110400917942102",
        "YD5110400917939101",
        "YD5110400917941102",
        "YD5110400917941101",
        "YD5110400917939102",
        "YD5110400917944102"
    ]

    print(f"开始处理 {len(tracking_numbers)} 个运单号（使用代理绕过）...")

    for i, tn in enumerate(tracking_numbers, 1):
        print(f"进度: {i}/{len(tracking_numbers)}")
        send_without_proxy(tn)
        time.sleep(0.5)


if __name__ == "__main__":
    # 首先尝试主程序
    try:
        main()
    except Exception as e:
        print(f"主程序失败: {e}")
        print("尝试使用代理绕过方案...")
        alternative_main()