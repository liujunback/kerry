from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestInventoryAlerts(FunctionalBaseCase):
    def test_01_list_alerts_should_succeed(self):
        """库存预警-列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/alerts",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("data") is not None or result.get("success"), result.get("message"))

    def test_02_generate_alerts_should_succeed(self):
        """库存预警-生成预警成功"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/inventory/alerts",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_03_list_alerts_after_generate_should_succeed(self):
        """库存预警-生成后列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/alerts",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("data") is not None or result.get("success"), result.get("message"))
