from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestRelationEdgeCasesMiscSmoke(FunctionalBaseCase):
    def test_01_user_roles_delete_invalid_again_should_fail(self):
        """关系边界补充-非法用户角色解绑再次失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/users/{INVALID_UUID}/roles/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_user_warehouse_delete_invalid_again_should_fail(self):
        """关系边界补充-非法用户仓库解绑再次失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/users/{INVALID_UUID}/warehouses/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_03_client_warehouse_delete_invalid_again_should_fail(self):
        """关系边界补充-非法客户仓库解绑再次失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/clients/{INVALID_UUID}/warehouses/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_role_permission_delete_invalid_again_should_fail(self):
        """关系边界补充-非法角色权限解绑再次失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/roles/{INVALID_UUID}/permissions/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_05_user_default_warehouse_patch_invalid_again_should_fail(self):
        """关系边界补充-非法默认仓库PATCH再次失败"""
        result = normalize_result(
            self.session.api_request(
                "PATCH",
                f"/api/v1/users/{INVALID_UUID}/warehouses/default",
                data={"warehouseId": INVALID_UUID},
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_client_warehouses_get_invalid_again_should_fail(self):
        """关系边界补充-非法客户仓库列表再次失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/clients/{INVALID_UUID}/warehouses"))
        self.assertFalse(result.get("success"))

    def test_07_user_warehouses_get_invalid_again_should_fail(self):
        """关系边界补充-非法用户仓库列表再次失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/users/{INVALID_UUID}/warehouses"))
        self.assertFalse(result.get("success"))

    def test_08_user_roles_get_invalid_again_should_fail(self):
        """关系边界补充-非法用户角色列表再次失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/users/{INVALID_UUID}/roles"))
        self.assertFalse(result.get("success"))
