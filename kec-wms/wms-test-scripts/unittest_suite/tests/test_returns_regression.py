from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestReturnsRegression(FunctionalBaseCase):
    def test_01_returns_list_should_succeed(self):
        """退件模块-退件列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/returns", query={"pageSize": 10}))
        self.assertTrue(result.get("success"), result.get("message") or result.get("error"))

    def test_02_returns_putaway_candidates_should_succeed(self):
        """退件模块-退件上架候选查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/returns/putaway/candidates"))
        self.assertTrue(result.get("success"), result.get("message") or result.get("error"))

    def test_03_invalid_return_create_without_api_key_should_fail(self):
        """退件模块-非API Key创建退件失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/returns",
                data={
                    "clientCode": self.base_data["client_code"],
                    "warehouseCode": self.base_data["warehouse_code"],
                    "preReturnNo": f"RET-{self.unique_tag}",
                    "logisticsNo": f"LG-{self.unique_tag}",
                    "lines": [
                        {
                            "skuCode": self.base_data["sku_code"],
                            "expectedQty": 1,
                        }
                    ],
                },
            )
        )
        self.assertFalse(result.get("success"))
