from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestDashboardBoards(FunctionalBaseCase):
    def test_01_inbound_dashboard_should_succeed(self):
        """看板管理-入库看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/inbound",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertIn("summary", result.get("data", {}))

    def test_02_inbound_timeout_dashboard_should_succeed(self):
        """看板管理-入库超时看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/inbound/timeout",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertIn("summary", result.get("data", {}))

    def test_03_outbound_dashboard_should_succeed(self):
        """看板管理-出库看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/outbound",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertIn("summary", result.get("data", {}))

    def test_04_outbound_timeout_dashboard_should_succeed(self):
        """看板管理-出库超时看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/outbound/timeout",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertIn("summary", result.get("data", {}))
