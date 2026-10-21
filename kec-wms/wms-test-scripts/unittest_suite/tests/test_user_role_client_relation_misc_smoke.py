from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestUserRoleClientRelationMiscSmoke(FunctionalBaseCase):
    def test_01_user_warehouses_get_invalid_should_fail(self):
        """关系扩展-非法用户仓库查询失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/users/{INVALID_UUID}/warehouses"))
        self.assertFalse(result.get("success"))

    def test_02_user_warehouses_post_invalid_should_fail(self):
        """关系扩展-非法用户仓库绑定失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/users/{INVALID_UUID}/warehouses",
                data={"warehouseId": INVALID_UUID, "isDefault": True},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_user_roles_get_invalid_should_fail(self):
        """关系扩展-非法用户角色查询失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/users/{INVALID_UUID}/roles"))
        self.assertFalse(result.get("success"))

    def test_04_user_roles_post_invalid_should_fail(self):
        """关系扩展-非法用户角色分配失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/users/{INVALID_UUID}/roles",
                data={"roleId": INVALID_UUID},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_role_permissions_get_invalid_should_fail(self):
        """关系扩展-非法角色权限查询失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/roles/{INVALID_UUID}/permissions"))
        self.assertFalse(result.get("success"))

    def test_06_role_permissions_put_invalid_should_fail(self):
        """关系扩展-非法角色权限更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/roles/{INVALID_UUID}/permissions",
                data={"permissionIds": [INVALID_UUID]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_client_warehouses_get_invalid_should_fail(self):
        """关系扩展-非法客户仓库查询失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/clients/{INVALID_UUID}/warehouses"))
        self.assertFalse(result.get("success"))

    def test_08_client_warehouses_post_invalid_should_fail(self):
        """关系扩展-非法客户仓库绑定失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/clients/{INVALID_UUID}/warehouses",
                data={"warehouseId": INVALID_UUID, "isDefault": True},
            )
        )
        self.assertFalse(result.get("success"))

    def test_09_role_delete_invalid_should_fail(self):
        """关系扩展-非法角色删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/roles/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_10_user_delete_role_invalid_should_fail(self):
        """关系扩展-非法用户角色解绑失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/users/{INVALID_UUID}/roles/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))
