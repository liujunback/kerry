from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestAuthPublicSmoke(FunctionalBaseCase):
    def test_01_auth_captcha_should_succeed(self):
        """认证模块-验证码生成成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/auth/captcha"))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_02_auth_login_invalid_should_fail(self):
        """认证模块-非法登录失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/auth/login",
                data={"tenantCode": "DEFAULT", "username": "invalid-user", "password": "invalid-pass"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_auth_login_missing_fields_should_fail(self):
        """认证模块-缺失字段登录失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/auth/login", data={}))
        self.assertFalse(result.get("success"))

    def test_04_auth_pda_token_login_missing_token_should_fail(self):
        """认证模块-PDA令牌登录缺参失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/auth/pda-token-login", data={}))
        self.assertFalse(result.get("success"))
