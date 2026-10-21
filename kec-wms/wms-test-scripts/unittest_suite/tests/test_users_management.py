from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestUsersManagement(FunctionalBaseCase):
    REUSABLE_USERNAME = "autotest_user_reuse"
    REUSABLE_EMAIL = "autotest_user_reuse@example.com"
    REUSABLE_EMPLOYEE_ID = "E2E_USER_REUSE"

    def _query_user_by_username(self, username):
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/users",
                query={"search": username, "pageSize": 10},
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        for item in result.get("data") or []:
            if item.get("username") == username:
                return item
        return None

    def _ensure_reusable_user(self):
        existing = self._query_user_by_username(self.REUSABLE_USERNAME)
        if existing:
            return existing

        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/users",
                data={
                    "username": self.REUSABLE_USERNAME,
                    "fullName": "自动化回归用户",
                    "email": self.REUSABLE_EMAIL,
                    "phone": "13800000000",
                    "employeeId": self.REUSABLE_EMPLOYEE_ID,
                    "department": "QA",
                    "position": "Tester",
                    "userType": "INTERNAL",
                    "password": "Admin@123",
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        return result["data"]

    def test_01_list_users_should_succeed(self):
        """用户管理-用户列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/users", query={"pageSize": 10}))
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_search_existing_user_should_succeed(self):
        """用户管理-按用户名查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/users",
                query={"search": self.session.config["username"], "pageSize": 10},
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertGreater(len(result.get("data") or []), 0)

    def test_03_create_user_should_succeed(self):
        """用户管理-创建或复用测试用户成功"""
        user = self._ensure_reusable_user()
        self.assertEqual(user["username"], self.REUSABLE_USERNAME)

    def test_04_create_duplicate_user_should_fail(self):
        """用户管理-重复用户名创建失败"""
        self._ensure_reusable_user()
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/users",
                data={
                    "username": self.REUSABLE_USERNAME,
                    "fullName": "重复用户",
                    "email": "dup-user@example.com",
                    "userType": "INTERNAL",
                    "password": "Admin@123",
                },
            )
        )
        self.assertFalse(result.get("success"))
