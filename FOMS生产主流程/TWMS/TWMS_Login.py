import json
import random
import datetime
import re
import requests
from bs4 import BeautifulSoup  # 使用更可靠的HTML解析库
import logging
from FOMS生产主流程.properties.GetProperties import getProperties

# 配置日志



def Twms_CN_login(properties):
    """
    登录TWMS系统并获取认证信息

    参数:
        properties: 配置属性字典

    返回:
        包含认证信息的字典，格式为:
        {
            "cookies": {
                "XSRF-TOKEN": token_value,
                "laravel_session": session_value
            },
            "csrf_token": csrf_token_value
        }
        或 None（登录失败时）
    """
    try:
        # 获取配置信息
        url = properties.get("twms_url", "") + '/opt/login'
        username = properties.get("twms_username", "")
        password = properties.get("twms_password", "")

        if not url or not username or not password:
            logging.error("❌ 配置信息不完整，无法登录")
            return None

        # 创建会话以保持cookies
        session = requests.Session()

        # 1. 获取登录页面，提取CSRF令牌
        try:
            response = session.get(url)
            response.raise_for_status()  # 检查HTTP错误
        except requests.exceptions.RequestException as e:
            logging.error(f"❌ 获取登录页面失败: {str(e)}")
            return None

        # 使用BeautifulSoup解析HTML，更可靠
        soup = BeautifulSoup(response.text, 'html.parser')
        csrf_input = soup.find('input', {'name': '_token'})

        if not csrf_input or not csrf_input.get('value'):
            logging.error("❌ 无法从页面提取CSRF令牌")
            return None

        c_token = csrf_input.get('value')
        # 2. 准备登录数据
        payload = {
            "username": username,
            "password": password,
            "_token": c_token
        }
        # 3. 执行登录
        try:
            login_response = session.post(url, data=payload)
            login_response.raise_for_status()
        except requests.exceptions.RequestException as e:
            logging.error(f"❌ 登录请求失败: {str(e)}")
            return None

        # 4. 检查登录是否成功
        if "csrf-token" not in login_response.text:
            # 尝试提取错误信息
            error_msg = "未知错误"
            error_div = soup.find('div', class_='alert-danger')
            if error_div:
                error_msg = error_div.text.strip()

            logging.error(f"❌ 登录失败: {error_msg}")
            return None

        # 5. 提取登录后的CSRF令牌
        soup = BeautifulSoup(login_response.text, 'html.parser')
        meta_csrf = soup.find('meta', {'name': 'csrf-token'})

        if not meta_csrf or not meta_csrf.get('content'):
            logging.warning("⚠️ 无法从meta标签提取CSRF令牌，尝试其他方法")
            # 尝试正则表达式作为备用方案
            csrf_matches = re.findall(r'csrf-token\" content=\"(.+?)\"', login_response.text)
            if csrf_matches:
                csrf_token = csrf_matches[0]
            else:
                logging.error("❌ 完全无法提取CSRF令牌")
                return None
        else:
            csrf_token = meta_csrf.get('content')

        # 6. 获取cookies
        xsrf_token = session.cookies.get('XSRF-TOKEN', '')
        laravel_session = session.cookies.get('laravel_session', '')

        if not xsrf_token or not laravel_session:
            logging.warning("⚠️ 部分cookies缺失，但继续流程")

        # 7. 返回认证信息
        logging.info("✅ 登录成功")
        return {
            "cookies": {
                "XSRF-TOKEN": xsrf_token,
                "laravel_session": laravel_session
            },
            "csrf_token": csrf_token
        }

    except Exception as e:
        logging.error(f"❌ 登录过程中发生未预期错误: {str(e)}")
        return None


