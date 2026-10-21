#!/usr/bin/env python3
"""
Locust 登录压测脚本
从 Excel 文件读取用户凭据，使用 Locust 进行并发登录压测

依赖安装:
    pip install locust openpyxl

使用方式:
    locust -f login_locust.py --host=http://localhost:3000

    或者无界面模式:
    locust -f login_locust.py --host=http://localhost:3000 --headless -u 10 -r 2 -t 60s

    参数说明:
    -u: 并发用户数
    -r: 每秒启动用户数
    -t: 测试持续时间
"""

import os
import itertools
import threading
from openpyxl import load_workbook
from locust import HttpUser, task, between, events


# Excel 文件路径 (可通过环境变量配置)
EXCEL_FILE = os.environ.get("LOGIN_EXCEL_FILE", "users.xlsx")

# 用户数据队列 (线程安全的循环迭代器)
_user_data_lock = threading.Lock()
_user_data_cycle = None


def read_users_from_excel(file_path: str) -> list[dict[str, str]]:
    """从 Excel 文件读取用户列表，要求包含 email、password 和 number 列"""
    wb = load_workbook(file_path, read_only=True)
    ws = wb.active

    # 读取表头，找到 email、password 和 number 列索引
    headers = []
    for cell in next(ws.iter_rows(min_row=1, max_row=1)):
        headers.append(str(cell.value or "").strip().lower())

    if "email" not in headers or "password" not in headers:
        raise ValueError(
            f"Excel 文件必须包含 'email' 和 'password' 列。当前列: {headers}"
        )

    email_idx = headers.index("email")
    password_idx = headers.index("password")
    # number 列可选，如果没有则使用第三列（索引2）
    number_idx = headers.index("number") if "number" in headers else 2

    users = []
    for row in ws.iter_rows(min_row=2):
        email = str(row[email_idx].value or "").strip()
        password = str(row[password_idx].value or "").strip()
        # 读取 number 列，如果索引超出范围或为空则使用空字符串
        number = ""
        if len(row) > number_idx and row[number_idx].value:
            number = str(row[number_idx].value).strip()
        if email and password:
            users.append({"email": email, "password": password, "number": number})

    wb.close()
    return users


def get_next_user() -> dict[str, str]:
    """线程安全地获取下一个用户凭据 (循环读取)"""
    global _user_data_cycle
    with _user_data_lock:
        if _user_data_cycle is None:
            users = read_users_from_excel(EXCEL_FILE)
            if not users:
                raise ValueError("Excel 文件中没有找到有效的用户数据")
            print(f"[Locust] 从 {EXCEL_FILE} 加载了 {len(users)} 个用户")
            _user_data_cycle = itertools.cycle(users)
        return next(_user_data_cycle)


def reload_users():
    """重新加载 Excel 用户数据"""
    global _user_data_cycle
    with _user_data_lock:
        users = read_users_from_excel(EXCEL_FILE)
        if users:
            _user_data_cycle = itertools.cycle(users)
            print(f"[Locust] 重新加载了 {len(users)} 个用户")
        return len(users)


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """测试开始时加载用户数据"""
    print(f"[Locust] 测试开始，加载 Excel 文件: {EXCEL_FILE}")
    try:
        reload_users()
    except Exception as e:
        print(f"[Locust] 加载用户数据失败: {e}")


class LoginUser(HttpUser):
    """登录压测用户"""

    # 每个任务之间等待 1-3 秒
    wait_time = between(1, 3)

    def on_start(self):
        """用户启动时获取凭据"""
        user_data = get_next_user()
        self.email = user_data["email"]
        self.password = user_data["password"]
        self.csrf_token = None

    @task
    def login_flow(self):
        """完整的登录流程"""
        # 步骤1: 获取 CSRF token
        with self.client.get(
            "/api/auth/csrf",
            name="获取CSRF",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    self.csrf_token = response.json().get("csrfToken", "")
                    if not self.csrf_token:
                        response.failure("CSRF token 为空")
                        return
                    response.success()
                except Exception as e:
                    response.failure(f"解析 CSRF 响应失败: {e}")
                    return
            else:
                response.failure(f"获取 CSRF 失败: {response.status_code}")
                return

        # 步骤2: 发送登录请求
        with self.client.post(
            "/api/auth/callback/credentials",
            data={
                "email": self.email,
                "password": self.password,
                "rememberMe": "false",
                "csrfToken": self.csrf_token,
                "json": "true",
            },
            name="登录",
            catch_response=True,
            allow_redirects=True
        ) as response:
            final_url = str(response.url)

            if "error" in final_url:
                response.failure(f"登录失败: {self.email}")
                return

            # 检查 session cookie
            cookies = self.client.cookies.get_dict()
            has_session = any("session-token" in k for k in cookies)

            if not has_session:
                response.failure("未获取到 session cookie")
                return

            response.success()

        # 步骤3: 验证 Dashboard 访问
        with self.client.get(
            "/dashboard",
            name="访问Dashboard",
            catch_response=True,
            allow_redirects=False
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code in (301, 302, 307, 308):
                location = response.headers.get("Location", "")
                if "/login" in location:
                    response.failure("被重定向到登录页")
                else:
                    response.success()
            else:
                response.failure(f"Dashboard 返回 {response.status_code}")

        # 每次登录后切换到下一个用户凭据
        user_data = get_next_user()
        self.email = user_data["email"]
        self.password = user_data["password"]


class QuickLoginUser(HttpUser):
    """快速登录压测 (仅测试登录接口，不验证 Dashboard)"""

    wait_time = between(0.5, 1.5)

    def on_start(self):
        user_data = get_next_user()
        self.email = user_data["email"]
        self.password = user_data["password"]
        self.csrf_token = None

    @task
    def quick_login(self):
        """快速登录测试"""
        # 获取 CSRF token
        with self.client.get(
            "/api/auth/csrf",
            name="获取CSRF",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    self.csrf_token = response.json().get("csrfToken", "")
                    response.success()
                except:
                    response.failure("解析失败")
                    return
            else:
                response.failure(f"HTTP {response.status_code}")
                return

        # 登录
        with self.client.post(
            "/api/auth/callback/credentials",
            data={
                "email": self.email,
                "password": self.password,
                "rememberMe": "false",
                "csrfToken": self.csrf_token,
                "json": "true",
            },
            name="登录",
            catch_response=True,
            allow_redirects=True
        ) as response:
            if "error" in str(response.url):
                response.failure("登录失败")
            else:
                response.success()

        # 切换用户
        user_data = get_next_user()
        self.email = user_data["email"]
        self.password = user_data["password"]


class PickupOrderQueryUser(HttpUser):
    """登录后查询订单接口压测"""

    wait_time = between(1, 2)

    def on_start(self):
        """启动时登录获取 session"""
        user_data = get_next_user()
        self.email = user_data["email"]
        self.password = user_data["password"]
        self.order_no = user_data.get("number", "")
        self.logged_in = False
        self._do_login()

    def _do_login(self):
        """执行登录流程"""
        # 获取 CSRF token
        csrf_resp = self.client.get("/api/auth/csrf", name="获取CSRF")
        if csrf_resp.status_code != 200:
            print(f"[PickupOrderQueryUser] 获取 CSRF 失败: {csrf_resp.status_code}")
            return

        try:
            csrf_token = csrf_resp.json().get("csrfToken", "")
        except:
            print("[PickupOrderQueryUser] 解析 CSRF 响应失败")
            return

        # 登录
        login_resp = self.client.post(
            "/api/auth/callback/credentials",
            data={
                "email": self.email,
                "password": self.password,
                "rememberMe": "false",
                "csrfToken": csrf_token,
                "json": "true",
            },
            allow_redirects=True,
            name="登录"
        )

        if "error" not in str(login_resp.url):
            cookies = self.client.cookies.get_dict()
            if any("session-token" in k for k in cookies):
                self.logged_in = True
                print(f"[PickupOrderQueryUser] 登录成功: {self.email}, orderNo: {self.order_no}")
            else:
                print(f"[PickupOrderQueryUser] 登录失败，无 session: {self.email}")
        else:
            print(f"[PickupOrderQueryUser] 登录失败: {self.email}")

    @task(3)
    def query_pickup_orders(self):
        """查询取件订单列表"""
        if not self.logged_in:
            self._do_login()
            if not self.logged_in:
                return

        params = {
            "page": 1,
            "limit": 5,
            "status": "DEL_ACCEPTED_BY_PUDO,DEL_EXPIRED",
            "sortBy": "created_at",
            "sortDirection": "desc",
        }
        # 如果有 orderNo 则添加到查询参数
        if self.order_no:
            params["orderNo"] = self.order_no

        with self.client.get(
            "/api/operations/pickup-orders-query",
            params=params,
            name="查询取件订单",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("未授权，需要重新登录")
                self.logged_in = False
            else:
                response.failure(f"HTTP {response.status_code}")

    @task(1)
    def query_with_order_no(self):
        """按订单号查询"""
        if not self.logged_in:
            self._do_login()
            if not self.logged_in:
                return

        # 使用 Excel 中的 number 作为 orderNo
        order_no = self.order_no if self.order_no else "ITTEST"

        with self.client.get(
            "/api/operations/pickup-orders-query",
            params={
                "page": 1,
                "limit": 5,
                "status": "DEL_ACCEPTED_BY_PUDO,DEL_EXPIRED",
                "sortBy": "created_at",
                "sortDirection": "desc",
                "orderNo": order_no,
            },
            name="按订单号查询",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 401:
                response.failure("未授权，需要重新登录")
                self.logged_in = False
            else:
                response.failure(f"HTTP {response.status_code}")


class FullFlowUser(HttpUser):
    """完整业务流程压测: 登录 -> 查询订单"""

    wait_time = between(1, 3)

    def on_start(self):
        user_data = get_next_user()
        self.email = user_data["email"]
        self.password = user_data["password"]
        self.order_no = user_data.get("number", "")
        self.csrf_token = None
        self.logged_in = False

    @task
    def full_flow(self):
        """完整业务流程"""
        # 步骤1: 获取 CSRF token
        with self.client.get(
            "/api/auth/csrf",
            name="获取CSRF",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                try:
                    self.csrf_token = response.json().get("csrfToken", "")
                    response.success()
                except:
                    response.failure("解析失败")
                    return
            else:
                response.failure(f"HTTP {response.status_code}")
                return

        # 步骤2: 登录
        with self.client.post(
            "/api/auth/callback/credentials",
            data={
                "email": self.email,
                "password": self.password,
                "rememberMe": "false",
                "csrfToken": self.csrf_token,
                "json": "true",
            },
            name="登录",
            catch_response=True,
            allow_redirects=True
        ) as response:
            if "error" in str(response.url):
                response.failure("登录失败")
                return
            cookies = self.client.cookies.get_dict()
            if not any("session-token" in k for k in cookies):
                response.failure("无session")
                return
            response.success()

        # 步骤3: 访问 Dashboard
        with self.client.get(
            "/dashboard",
            name="访问Dashboard",
            catch_response=True,
            allow_redirects=False
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code in (301, 302, 307, 308):
                location = response.headers.get("Location", "")
                if "/login" in location:
                    response.failure("重定向到登录页")
                    return
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")
                return

        # 步骤4: 查询取件订单 (使用 Excel 中的 number)
        params = {
            "page": 1,
            "limit": 5,
            "status": "DEL_ACCEPTED_BY_PUDO,DEL_EXPIRED",
            "sortBy": "created_at",
            "sortDirection": "desc",
        }
        if self.order_no:
            params["orderNo"] = self.order_no

        with self.client.get(
            "/api/operations/pickup-orders-query",
            params=params,
            name="查询订单",
            catch_response=True
        ) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"HTTP {response.status_code}")

        # 切换用户
        user_data = get_next_user()
        self.email = user_data["email"]
        self.password = user_data["password"]
        self.order_no = user_data.get("number", "")