from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestStatusPayloadEdgeMiscSmoke(FunctionalBaseCase):
    def test_01_client_status_invalid_enum_should_fail(self):
        """状态载荷补充-客户状态非法枚举失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/clients/{INVALID_UUID}/status", data={"isActive": "INVALID"})
        )
        self.assertFalse(result.get("success"))

    def test_02_warehouse_status_invalid_enum_should_fail(self):
        """状态载荷补充-仓库状态非法枚举失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/warehouses/{INVALID_UUID}/status", data={"status": "INVALID"})
        )
        self.assertFalse(result.get("success"))

    def test_03_zone_status_invalid_enum_should_fail(self):
        """状态载荷补充-库区状态非法枚举失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/zones/{INVALID_UUID}/status",
                data={"status": "INVALID"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_sku_status_invalid_enum_should_fail(self):
        """状态载荷补充-SKU状态非法枚举失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/skus/{INVALID_UUID}/status", data={"status": "INVALID"})
        )
        self.assertFalse(result.get("success"))

    def test_05_bin_status_invalid_enum_should_fail(self):
        """状态载荷补充-库位状态非法枚举失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/bin-locations/{INVALID_UUID}/status",
                data={"status": "INVALID"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_bin_lock_invalid_enum_should_fail(self):
        """状态载荷补充-库位锁定非法枚举失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/bin-locations/{INVALID_UUID}/lock",
                data={"lockStatus": "INVALID"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
