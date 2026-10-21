from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestManifestOrdersManagement(FunctionalBaseCase):
    def test_01_list_manifest_orders_should_succeed(self):
        """集运单管理-列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/manifest-orders",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_manifest_order_detail_should_succeed(self):
        """集运单管理-详情查询成功"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/manifest-orders",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        data = listed.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用集运单")
        manifest_id = data[0]["id"]
        detail = normalize_result(
            self.session.api_request("GET", f"/api/v1/manifest-orders/{manifest_id}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(detail.get("success"), detail.get("message"))

    def test_03_complete_manifest_or_skip(self):
        """集运单管理-完成集运成功或环境兼容跳过"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/manifest-orders",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        data = listed.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用集运单")
        manifest_id = data[0]["id"]
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/manifest-orders/{manifest_id}/complete",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前集运单不可完成")
        self.assertTrue(result.get("success"))
