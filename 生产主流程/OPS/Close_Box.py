import json
import requests
import time
from urllib.parse import urljoin
from typing import Dict, List, Union

from 生产主流程.properties.GetProperties import getProperties
from 生产主流程.public.Ops_Login import Ops_Login


def Close_Box(
        box_num: str,
        tracking_num: List[str],
        properties: Dict[str, str],
        token: str,
        max_retries: int = 3,
        retry_delay: float = 2.0
) -> bool:
    base_url = properties['ops_url']
    endpoint = "/pss/manual/closeBox"
    url = base_url + endpoint

    payload = {
        "trackingNumbers": tracking_num,
        "isReferenceNumber": 0,
        "boxNumber": box_num,
        "code": "BAFYL"
    }

    headers = {
        'Authorization': token,
        'token': token,
        'Content-Type': 'application/json'
    }

    for attempt in range(max_retries):
        try:
            response = requests.post(
                url,
                json=payload,  # 自动处理JSON序列化和Content-Type
                headers=headers,
                verify=False,
                timeout=10  # 添加超时设置
            )
            response.raise_for_status()  # 检查HTTP状态码

            result = response.json()
            if result.get("code") == 200:
                print(f"✅ 关箱成功 | 箱号: {box_num} | 运单数: {len(tracking_num)}")
                return True
            else:
                error_msg = result.get("msg") or response.text
                print(f"❌ 关箱失败 | 业务错误: {error_msg}")
                return False

        except requests.exceptions.RequestException as e:
            print(f"⚠️ 请求异常 (尝试 {attempt + 1}/{max_retries}): {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
                retry_delay *= 1.5  # 指数退避策略
            else:
                print(f"❌ 关箱操作最终失败: {str(e)}")
                return False
        except json.JSONDecodeError:
            print(f"❌ 响应解析失败 | 原始响应: {response.text[:200]}...")
            return False