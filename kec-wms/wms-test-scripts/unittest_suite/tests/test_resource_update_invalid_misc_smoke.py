from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestResourceUpdateInvalidMiscSmoke(FunctionalBaseCase):
    def test_01_client_update_invalid_again_should_fail(self):
        """资源更新补充-非法客户更新再次失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/clients/{INVALID_UUID}", data={"clientName": "invalid-client-again"})
        )
        self.assertFalse(result.get("success"))

    def test_02_warehouse_update_invalid_again_should_fail(self):
        """资源更新补充-非法仓库更新再次失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/warehouses/{INVALID_UUID}", data={"warehouseName": "invalid-warehouse-again"})
        )
        self.assertFalse(result.get("success"))

    def test_03_zone_update_invalid_again_should_fail(self):
        """资源更新补充-非法库区更新再次失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/zones/{INVALID_UUID}",
                data={"zoneName": "invalid-zone-again"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_bin_update_invalid_again_should_fail(self):
        """资源更新补充-非法库位更新再次失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/bin-locations/{INVALID_UUID}",
                data={"aisle": "A02"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_user_update_invalid_again_should_fail(self):
        """资源更新补充-非法用户更新再次失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/users/{INVALID_UUID}", data={"fullName": "invalid-user-again"})
        )
        self.assertFalse(result.get("success"))

    def test_06_role_update_invalid_again_should_fail(self):
        """资源更新补充-非法角色更新再次失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/roles/{INVALID_UUID}", data={"roleName": "invalid-role-again"})
        )
        self.assertFalse(result.get("success"))

    def test_07_sku_update_invalid_again_should_fail(self):
        """资源更新补充-非法SKU更新再次失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/skus/{INVALID_UUID}", data={"skuName": "invalid-sku-again"})
        )
        self.assertFalse(result.get("success"))

    def test_08_container_update_invalid_again_should_fail(self):
        """资源更新补充-非法容器更新再次失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/containers/{INVALID_UUID}",
                data={"remarks": "invalid-container-again"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

