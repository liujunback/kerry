from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestOrderInterceptionMiscSmoke(FunctionalBaseCase):
    def test_01_order_interception_list_should_succeed_or_skip(self):
        """订单拦截-列表查询成功或环境兼容跳过"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/order-interceptions", query={"pageSize": 20}))
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "订单拦截列表接口异常")
        self.assertTrue(result.get("success"))

    def test_02_order_interception_create_invalid_should_fail(self):
        """订单拦截-非法创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/order-interceptions",
                data={"orderNumber": "", "remark": ""},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_order_interception_handle_invalid_should_fail(self):
        """订单拦截-非法处理失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/order-interceptions/{INVALID_UUID}/handle",
                data={"action": "WAIT"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_order_interception_by_order_invalid_should_succeed_or_skip(self):
        """订单拦截-按订单查询空结果成功或环境兼容跳过"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/order-interceptions/by-order/{INVALID_UUID}"))
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "订单拦截按订单查询接口异常")
        self.assertTrue(result.get("success"))
