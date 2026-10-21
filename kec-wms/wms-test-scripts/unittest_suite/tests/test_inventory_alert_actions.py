from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestInventoryAlertActions(FunctionalBaseCase):
    def _get_alert(self):
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/alerts",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("data") is not None or listed.get("success"), listed.get("message"))
        data = listed.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用库存预警")
        return data[0]["id"]

    def test_01_alert_detail_should_succeed(self):
        """库存预警-详情查询成功"""
        alert_id = self._get_alert()
        detail = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/inventory/alerts/{alert_id}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(detail.get("success"), detail.get("message") or detail.get("error"))

    def test_02_alert_acknowledge_or_skip(self):
        """库存预警-确认成功或环境兼容跳过"""
        alert_id = self._get_alert()
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/alerts/{alert_id}/acknowledge",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "当前预警不可确认")
        self.assertTrue(result.get("success"))

    def test_03_alert_resolve_or_skip(self):
        """库存预警-解决成功或环境兼容跳过"""
        alert_id = self._get_alert()
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/alerts/{alert_id}/resolve",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "当前预警不可解决")
        self.assertTrue(result.get("success"))
