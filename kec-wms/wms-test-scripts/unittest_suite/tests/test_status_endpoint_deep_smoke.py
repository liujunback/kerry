from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestStatusEndpointDeepSmoke(FunctionalBaseCase):
    def test_01_client_status_missing_body_should_fail(self):
        """状态接口深度-客户状态缺参失败"""
        result = normalize_result(self.session.api_request("PUT", f"/api/v1/clients/{INVALID_UUID}/status", data={}))
        self.assertFalse(result.get("success"))

    def test_02_warehouse_status_missing_body_should_fail(self):
        """状态接口深度-仓库状态缺参失败"""
        result = normalize_result(self.session.api_request("PUT", f"/api/v1/warehouses/{INVALID_UUID}/status", data={}))
        self.assertFalse(result.get("success"))

    def test_03_zone_status_missing_body_should_fail(self):
        """状态接口深度-库区状态缺参失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/zones/{INVALID_UUID}/status",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_sku_status_missing_body_should_fail(self):
        """状态接口深度-SKU状态缺参失败"""
        result = normalize_result(self.session.api_request("PUT", f"/api/v1/skus/{INVALID_UUID}/status", data={}))
        self.assertFalse(result.get("success"))

    def test_05_bin_location_status_missing_body_should_fail(self):
        """状态接口深度-库位状态缺参失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/bin-locations/{INVALID_UUID}/status",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_bin_location_lock_missing_body_should_fail(self):
        """状态接口深度-库位锁定缺参失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/bin-locations/{INVALID_UUID}/lock",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
