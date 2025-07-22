import json
import requests
from urllib.parse import urljoin  # 用于安全拼接URL


def Pos_Login(properties):
    """
    优化后的登录函数，获取POS系统token

    参数:
        properties: 包含登录所需属性的字典
            - url: 基础URL
            - username: 用户名
            - password: 密码

    返回:
        token: 登录成功返回token字符串
        None: 登录失败返回None
    """
    # 1. 使用解包方式获取属性
    base_url = properties.get('url')
    username = properties.get('username')
    password = properties.get('password')

    # 2. 验证必要参数是否存在
    if not all([base_url, username, password]):
        print("错误：缺少必要的登录参数")
        return None

    # 3. 使用urljoin安全拼接URL
    endpoint = "pos-web/token/get"
    full_url = urljoin(base_url, endpoint)

    # 4. 创建请求数据
    payload = json.dumps({
        "username": username,
        "password": password
    })

    headers = {
        'Content-Type': 'application/json'
    }

    try:
        # 5. 添加超时和SSL验证选项
        response = requests.post(
            full_url,
            headers=headers,
            data=payload,
            verify=False,  # 注意：verify=False有安全风险，生产环境应使用有效证书
            timeout=(3.05, 27)  # 连接超时3秒，读取超时27秒
        )

        # 6. 检查HTTP状态码
        response.raise_for_status()  # 非2xx状态码会抛出异常

        # 7. 解析JSON响应
        response_data = response.json()

        # 8. 检查业务逻辑状态码
        if response_data.get('code') == 200:
            return response_data.get('body', {}).get('token')
        else:
            # 9. 更详细的错误日志
            error_msg = response_data.get('message', '未知错误')
            print(f"登录失败: {error_msg} (状态码: {response_data.get('code')})")
            return None

    except requests.exceptions.RequestException as e:
        # 10. 分类处理不同的请求异常
        if isinstance(e, requests.exceptions.Timeout):
            print(f"请求超时: {str(e)}")
        elif isinstance(e, requests.exceptions.SSLError):
            print(f"SSL错误: {str(e)}")
        else:
            print(f"请求异常: {str(e)}")
        return None

    except (json.JSONDecodeError, KeyError) as e:
        # 11. 处理JSON解析错误
        print(f"响应解析错误: {str(e)}")
        return None