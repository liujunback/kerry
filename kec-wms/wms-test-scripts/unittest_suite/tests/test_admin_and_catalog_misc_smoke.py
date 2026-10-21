from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestAdminAndCatalogMiscSmoke(FunctionalBaseCase):
    def test_01_tenants_list_should_succeed(self):
        """管理与目录-租户列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/tenants", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_02_tenant_create_invalid_should_fail(self):
        """管理与目录-非法租户创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/tenants",
                data={"tenantCode": "", "tenantName": ""},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_tenant_detail_should_be_restricted(self):
        """管理与目录-租户详情受限"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/tenants/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_tenant_update_should_be_restricted(self):
        """管理与目录-租户更新受限"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/tenants/{INVALID_UUID}",
                data={"tenantName": "Restricted Update"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_tenant_delete_should_be_restricted(self):
        """管理与目录-租户删除受限"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/tenants/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_06_tenant_status_should_be_restricted(self):
        """管理与目录-租户状态修改受限"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/tenants/{INVALID_UUID}/status",
                data={"status": "ACTIVE"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_tenant_reset_password_should_be_restricted(self):
        """管理与目录-租户重置密码受限"""
        result = normalize_result(
            self.session.api_request("POST", f"/api/v1/tenants/{INVALID_UUID}/reset-password", data={})
        )
        self.assertFalse(result.get("success"))

    def test_08_combo_products_list_should_succeed(self):
        """管理与目录-组合商品列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/combo-products", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_09_combo_product_create_invalid_should_fail(self):
        """管理与目录-非法组合商品创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/combo-products",
                data={"clientId": self.base_data["client_id"], "comboCode": "", "comboName": "", "components": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_10_combo_product_detail_invalid_should_fail(self):
        """管理与目录-非法组合商品详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/combo-products/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_11_combo_product_update_invalid_should_fail(self):
        """管理与目录-非法组合商品更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/combo-products/{INVALID_UUID}",
                data={"comboName": "Invalid Update"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_12_combo_product_delete_invalid_should_fail(self):
        """管理与目录-非法组合商品删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/combo-products/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))
