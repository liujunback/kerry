import json
import requests
from urllib.parse import urlencode, urljoin


def tms_login(properties):
    """
    优化后的TMS登录函数，获取token

    参数:
        properties: 包含登录所需属性的字典，必须包含:
            - tms_url: 基础URL
            - tms_login_name: 用户名
            - tms_login_password: 密码

    返回:
        str: 登录成功返回token字符串
        None: 登录失败返回None
    """
    # 验证必要参数是否存在
    required_keys = ['tms_url', 'tms_login_name', 'tms_login_password']
    if not all(key in properties for key in required_keys):
        missing = [key for key in required_keys if key not in properties]
        print(f"错误：缺少必要的登录参数: {', '.join(missing)}")
        return None

    try:
        # 安全拼接URL
        base_url = properties['tms_url']
        endpoint = "/tms-saas-web/user/login"
        full_url = urljoin(base_url, endpoint)

        # 使用urlencode安全构建查询参数
        query_params = {
            "userNo": properties['tms_login_name'],
            "password": properties['tms_login_password'],
            "companyNo": "",  # 空值参数保留
            "domain": ""  # 空值参数保留
        }
        encoded_params = urlencode(query_params)
        url_with_params = f"{full_url}?{encoded_params}"

        # 添加超时设置和SSL验证选项
        response = requests.post(
            url=url_with_params,
            verify=False,  # 注意：生产环境应使用有效证书
            timeout=(3.05, 27)  # 连接超时3秒，读取超时27秒
        )

        # 检查HTTP状态码
        if response.status_code != 200:
            print(f"HTTP错误: 状态码 {response.status_code}, 响应内容: {response.text}")
            return None

        # 尝试解析JSON响应
        try:
            response_data = response.json()
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {str(e)}, 响应内容: {response.text}")
            return None

        # 安全获取token
        if "body" in response_data and "token" in response_data["body"]:
            return response_data["body"]["token"]
        else:
            error_msg = response_data.get("message", "未知错误")
            print(f"登录失败: {error_msg}")
            return None

    except requests.exceptions.RequestException as e:
        # 分类处理不同的请求异常
        if isinstance(e, requests.exceptions.Timeout):
            print(f"请求超时: {str(e)}")
        elif isinstance(e, requests.exceptions.SSLError):
            print(f"SSL错误: {str(e)}")
        elif isinstance(e, requests.exceptions.ConnectionError):
            print(f"连接错误: {str(e)}")
        else:
            print(f"请求异常: {str(e)}")
        return None

