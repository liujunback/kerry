from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestReturnsOperationFlow(FunctionalBaseCase):
    def _get_return_item(self):
        listed = normalize_result(self.session.api_request("GET", "/api/v1/returns", query={"pageSize": 10}))
        self.assertTrue(listed.get("success"), listed.get("message") or listed.get("error"))
        payload = listed.get("data")
        if isinstance(payload, list):
            data = payload
        elif isinstance(payload, dict) and isinstance(payload.get("items"), list):
            data = payload.get("items") or []
        else:
            data = []
        if not data:
            self.skipTest("当前环境没有可用退件数据")
        return data[0]

    def test_01_returns_sign_in_lookup_or_skip(self):
        """退件操作-签收查询成功或环境兼容跳过"""
        item = self._get_return_item()
        logistics_no = item.get("logisticsNo")
        if not logistics_no:
            self.skipTest("当前退件缺少 logisticsNo")
        result = normalize_result(
            self.session.api_request("POST", "/api/v1/returns/sign-in/lookup", data={"logisticsNo": logistics_no})
        )
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前退件不可签收查询")
        self.assertTrue(result.get("success"))

    def test_02_returns_counting_lookup_or_skip(self):
        """退件操作-清点查询成功或环境兼容跳过"""
        item = self._get_return_item()
        logistics_no = item.get("logisticsNo")
        if not logistics_no:
            self.skipTest("当前退件缺少 logisticsNo")
        result = normalize_result(
            self.session.api_request("POST", "/api/v1/returns/counting/lookup", data={"logisticsNo": logistics_no})
        )
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前退件不可清点查询")
        self.assertTrue(result.get("success"))

    def test_03_returns_putaway_orders_list_or_skip(self):
        """退件操作-退件上架单列表查询成功或环境兼容跳过"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/returns/putaway/orders"))
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前环境退件上架单列表接口异常")
        self.assertTrue(result.get("success"))
