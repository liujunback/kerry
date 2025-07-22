import requests
from urllib.parse import urljoin  # 用于安全拼接URL


def Ops_Login(properties):
    """
    优化后的登录函数，获取OPS系统token

    参数:
        properties: 包含登录所需属性的字典，必须包含以下键:
            - ops_url: 基础URL
            - ops_username: 用户名
            - ops_password: 密码
            - company: 公司标识
            - ops_server: 服务器标识

    返回:
        str: 登录成功返回token字符串
        None: 登录失败返回None
    """
    # 1. 使用解包方式获取属性
    required_keys = ['ops_url', 'ops_username', 'ops_password', 'company', 'ops_server']

    # 验证必要参数是否存在
    if not all(key in properties for key in required_keys):
        missing = [key for key in required_keys if key not in properties]
        print(f"错误：缺少必要的登录参数: {', '.join(missing)}")
        return None

    base_url = properties['ops_url']
    username = properties['ops_username']
    password = properties['ops_password']
    company = properties['company']
    server = properties['ops_server']

    # 2. 使用urljoin安全拼接URL
    endpoint = "/account/tms/login"
    full_url = base_url + endpoint
    # 3. 创建请求数据
    payload = {
        "userNo": username,
        "password": password,
        "server": server,
        "company": company
    }

    headers = {
        'Content-Type': 'application/json'
    }

    try:
        # 4. 添加超时设置
        response = requests.post(
            full_url,
            json=payload,  # 使用json参数自动序列化并设置Content-Type
            headers=headers,
            verify=False,  # 注意：verify=False有安全风险，生产环境应使用有效证书
            timeout=(3.05, 27)  # 连接超时3秒，读取超时27秒
        )

        # 5. 检查HTTP状态码
        if response.status_code != 200:
            print(f"HTTP错误: 状态码 {response.status_code}, 响应内容: {response.text}")
            return None

        # 6. 解析JSON响应
        response_data = response.json()

        # 7. 检查业务逻辑状态码
        if response_data.get('code') == 200:
            # 使用更安全的嵌套get方法避免KeyError
            return response_data.get('data', {}).get('token')
        else:
            # 8. 更详细的错误日志
            error_msg = response_data.get('message', '未知错误')
            print(f"登录失败: {error_msg} (业务状态码: {response_data.get('code')})")
            return None

    except requests.exceptions.RequestException as e:
        # 9. 分类处理不同的请求异常
        if isinstance(e, requests.exceptions.Timeout):
            print(f"请求超时: {str(e)}")
        elif isinstance(e, requests.exceptions.SSLError):
            print(f"SSL错误: {str(e)}")
        elif isinstance(e, requests.exceptions.ConnectionError):
            print(f"连接错误: {str(e)}")
        else:
            print(f"请求异常: {str(e)}")
        return None

    except (ValueError, KeyError) as e:
        # 10. 处理JSON解析错误和键缺失
        print(f"响应解析错误: {str(e)}, 响应内容: {response.text if 'response' in locals() else '无响应'}")
        return None