from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestCatalogEntityInvalidMiscSmoke(FunctionalBaseCase):
    def test_01_combo_product_detail_invalid_should_fail_again(self):
        """目录实体补充-非法组合商品详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/combo-products/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_combo_product_update_invalid_should_fail_again(self):
        """目录实体补充-非法组合商品更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/combo-products/{INVALID_UUID}",
                data={"comboName": "invalid-again"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_combo_product_delete_invalid_should_fail_again(self):
        """目录实体补充-非法组合商品删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/combo-products/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_sku_category_detail_invalid_should_fail_again(self):
        """目录实体补充-非法SKU分类详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/sku-categories/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_05_sku_category_update_invalid_should_fail_again(self):
        """目录实体补充-非法SKU分类更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/sku-categories/{INVALID_UUID}",
                data={"categoryName": "invalid-category"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_sku_category_delete_invalid_should_fail_again(self):
        """目录实体补充-非法SKU分类删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/sku-categories/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_07_packaging_material_inventory_alerts_should_succeed(self):
        """目录实体补充-包材预警列表成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/packaging-material-inventory/alerts",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_08_operation_logs_list_should_succeed_again(self):
        """目录实体补充-操作日志列表再次成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/operation-logs", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_09_audit_logs_list_should_succeed_again(self):
        """目录实体补充-审计日志列表再次成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/audits", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_10_permissions_list_should_succeed_again(self):
        """目录实体补充-权限列表再次成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/permissions", query={"pageSize": 50}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
