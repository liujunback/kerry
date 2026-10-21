from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestUserRoleBindingSmoke(FunctionalBaseCase):
    def test_01_user_role_remove_invalid_should_fail(self):
        """用户角色绑定-非法用户角色解绑失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/users/{INVALID_UUID}/roles/{INVALID_UUID}")
        )
        self.assertFalse(result.get("success"))

    def test_02_user_warehouse_unbind_invalid_should_fail(self):
        """用户角色绑定-非法用户仓库解绑失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/users/{INVALID_UUID}/warehouses/{INVALID_UUID}")
        )
        self.assertFalse(result.get("success"))

    def test_03_user_default_warehouse_invalid_should_fail(self):
        """用户角色绑定-非法默认仓库设置失败"""
        result = normalize_result(
            self.session.api_request(
                "PATCH",
                f"/api/v1/users/{INVALID_UUID}/warehouses/default",
                data={"warehouseId": INVALID_UUID},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_user_pda_login_token_invalid_should_fail(self):
        """用户角色绑定-非法PDA登录码生成失败"""
        result = normalize_result(
            self.session.api_request("POST", f"/api/v1/users/{INVALID_UUID}/pda-login-token", data={})
        )
        self.assertFalse(result.get("success"))

    def test_05_user_pda_login_token_pdf_invalid_should_fail(self):
        """用户角色绑定-非法PDA登录码PDF生成失败"""
        result = normalize_result(
            self.session.api_request("POST", f"/api/v1/users/{INVALID_UUID}/pda-login-token/pdf", data={})
        )
        self.assertFalse(result.get("success"))

    def test_06_users_batch_roles_invalid_should_fail(self):
        """用户角色绑定-非法批量分配角色失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/users/batch/roles",
                data={"userIds": [], "assignments": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_users_batch_warehouses_invalid_should_fail(self):
        """用户角色绑定-非法批量绑定仓库失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/users/batch/warehouses",
                data={"userIds": [], "warehouseIds": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_users_batch_warehouses_unbind_invalid_should_fail(self):
        """用户角色绑定-非法批量解绑仓库失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/users/batch/warehouses/unbind",
                data={"userIds": [], "warehouseId": INVALID_UUID},
            )
        )
        self.assertFalse(result.get("success"))

    def test_09_users_batch_pda_expiry_invalid_should_fail(self):
        """用户角色绑定-非法批量设置PDA时效失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/users/batch/pda-login-qrcode-expiry",
                data={"userIds": [], "expiresAt": None},
            )
        )
        self.assertFalse(result.get("success"))

    def test_10_role_permissions_update_invalid_should_fail(self):
        """用户角色绑定-非法角色权限更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/roles/{INVALID_UUID}/permissions",
                data={"permissionIds": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_11_role_permission_delete_invalid_should_fail(self):
        """用户角色绑定-非法角色权限删除失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/roles/{INVALID_UUID}/permissions/{INVALID_UUID}")
        )
        self.assertFalse(result.get("success"))
