from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestAdminCatalogDeepSmoke(FunctionalBaseCase):
    def test_01_api_key_patch_invalid_should_fail(self):
        """管理目录深度-非法API Key更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PATCH",
                f"/api/v1/api-keys/{INVALID_UUID}",
                data={"name": "invalid-key"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_api_key_delete_invalid_should_fail(self):
        """管理目录深度-非法API Key删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/api-keys/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_03_scheduled_task_detail_invalid_should_fail(self):
        """管理目录深度-非法定时任务详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/scheduled-tasks/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_scheduled_task_update_invalid_should_fail(self):
        """管理目录深度-非法定时任务更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/scheduled-tasks/{INVALID_UUID}",
                data={"taskName": "invalid-task"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_scheduled_task_delete_invalid_should_fail(self):
        """管理目录深度-非法定时任务删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/scheduled-tasks/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_06_combo_product_create_invalid_component_should_fail(self):
        """管理目录深度-非法组合商品组件失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/combo-products",
                data={
                    "clientId": self.base_data["client_id"],
                    "comboCode": "AUTO-COMBO-INVALID",
                    "comboName": "Invalid Combo",
                    "components": [{"skuId": INVALID_UUID, "quantity": 1, "unit": "PCS"}],
                },
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_tenant_detail_invalid_should_fail(self):
        """管理目录深度-非法租户详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/tenants/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_08_tenant_status_invalid_should_fail(self):
        """管理目录深度-非法租户状态修改失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/tenants/{INVALID_UUID}/status",
                data={"status": "ACTIVE"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_09_tenant_reset_password_invalid_should_fail(self):
        """管理目录深度-非法租户重置密码失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/tenants/{INVALID_UUID}/reset-password", data={}))
        self.assertFalse(result.get("success"))
