from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestResourceInvalidCrudSmoke(FunctionalBaseCase):
    def test_01_user_detail_invalid_should_fail(self):
        """资源非法CRUD-用户详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/users/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_user_update_invalid_should_fail(self):
        """资源非法CRUD-用户更新失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/users/{INVALID_UUID}", data={"fullName": "invalid-user"})
        )
        self.assertFalse(result.get("success"))

    def test_03_role_detail_invalid_should_fail(self):
        """资源非法CRUD-角色详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/roles/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_role_update_invalid_should_fail(self):
        """资源非法CRUD-角色更新失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/roles/{INVALID_UUID}", data={"roleName": "invalid-role"})
        )
        self.assertFalse(result.get("success"))

    def test_05_sku_detail_invalid_should_fail(self):
        """资源非法CRUD-SKU详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/skus/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_06_sku_update_invalid_should_fail(self):
        """资源非法CRUD-SKU更新失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/skus/{INVALID_UUID}", data={"skuName": "invalid-sku"})
        )
        self.assertFalse(result.get("success"))

    def test_07_client_detail_invalid_should_fail(self):
        """资源非法CRUD-客户详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/clients/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_08_client_update_invalid_should_fail(self):
        """资源非法CRUD-客户更新失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/clients/{INVALID_UUID}", data={"clientName": "invalid-client"})
        )
        self.assertFalse(result.get("success"))

    def test_09_client_delete_invalid_should_fail(self):
        """资源非法CRUD-客户删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/clients/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_10_warehouse_detail_invalid_should_fail(self):
        """资源非法CRUD-仓库详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/warehouses/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_11_warehouse_update_invalid_should_fail(self):
        """资源非法CRUD-仓库更新失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/warehouses/{INVALID_UUID}", data={"warehouseName": "invalid-wh"})
        )
        self.assertFalse(result.get("success"))

    def test_12_warehouse_delete_invalid_should_fail(self):
        """资源非法CRUD-仓库删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/warehouses/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_13_zone_detail_invalid_should_fail(self):
        """资源非法CRUD-库区详情失败"""
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/zones/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_14_zone_update_invalid_should_fail(self):
        """资源非法CRUD-库区更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/zones/{INVALID_UUID}",
                data={"zoneName": "invalid-zone"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_15_zone_delete_invalid_should_fail(self):
        """资源非法CRUD-库区删除失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/zones/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_16_bin_location_detail_invalid_should_fail(self):
        """资源非法CRUD-库位详情失败"""
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/bin-locations/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_17_bin_location_update_invalid_should_fail(self):
        """资源非法CRUD-库位更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/bin-locations/{INVALID_UUID}",
                data={"aisle": "A01"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_18_bin_location_delete_invalid_should_fail(self):
        """资源非法CRUD-库位删除失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/bin-locations/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_19_container_detail_invalid_should_fail(self):
        """资源非法CRUD-容器详情失败"""
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/containers/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_20_container_update_invalid_should_fail(self):
        """资源非法CRUD-容器更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/containers/{INVALID_UUID}",
                data={"remarks": "invalid-container"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_21_container_delete_invalid_should_fail(self):
        """资源非法CRUD-容器删除失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/containers/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))
