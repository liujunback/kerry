import json
import requests
from typing import Dict, Any, Optional


def close_box(properties: Dict[str, Any], login: Dict[str, Any],
              order_number: str, pick_wave_data: Dict[str, Any],pack_by="") -> Optional[str]:
    """
    关闭箱子并获取追踪号码

    Args:
        properties: 配置属性字典
        login: 登录信息字典
        order_number: 订单号
        pick_wave_data: 拣货波次数据

    Returns:
        追踪号码或None（失败时）
    """
    base_url = properties["TWMS_URL"].rstrip('/')
    url = f"{base_url}/opt/pack/ajax-close-box"

    # 创建会话并设置headers
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-TOKEN': login['csrf_token']
    })

    # 设置cookies
    cookies = {
        'XSRF-TOKEN': login['cookies']['XSRF-TOKEN'],
        'laravel_session': login['cookies']['laravel_session']
    }
    session.cookies.update(cookies)

    # 准备请求数据
    payload = {
        "order_number": order_number,
        "weight": 2,
        "box_type": properties["box_type"],
        "client_id": pick_wave_data["client_id"],
        "skip_weight": "no",
        "forceSkipWeight": 0,
        "pack_by": pack_by,
        "number_of_packages": 1
    }

    # 最多重试一次
    for attempt in range(2):
        try:
            # 发送请求
            response = session.post(url, data=payload)
            response.raise_for_status()  # 如果响应状态码不是200，将抛出异常

            # 解析响应
            response_data = response.json()

            if response_data.get('status') == 0:
                tracking_number = response_data['shipments'][0]["tracking_number"]
                print(f"打包入箱关箱成功：{tracking_number}")
                return tracking_number
            else:
                if attempt == 0:
                    print(f"第一次关箱失败，准备重试。响应：{response.text}")
                    continue
                else:
                    print(f"打包入箱关箱失败：{response.text}")
                    return None

        except requests.exceptions.RequestException as e:
            if attempt == 0:
                print(f"请求失败，准备重试。错误：{e}")
                continue
            else:
                print(f"请求失败：{e}")
                return None
        except json.JSONDecodeError:
            if attempt == 0:
                print("响应不是有效的JSON格式，准备重试")
                continue
            else:
                print("响应不是有效的JSON格式")
                return None
        except (KeyError, IndexError) as e:
            if attempt == 0:
                print(f"响应数据格式不正确，准备重试。错误：{e}")
                continue
            else:
                print(f"响应数据格式不正确：{e}")
                return None

    # 如果所有尝试都失败
    print("打包入箱关箱失败：所有尝试均未成功")
    return None