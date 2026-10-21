from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestResourceDeleteInvalidMiscSmoke(FunctionalBaseCase):
    def test_01_user_delete_invalid_should_fail(self):
        """资源删除补充-非法用户删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/users/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_sku_delete_invalid_should_fail(self):
        """资源删除补充-非法SKU删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/skus/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_03_zone_delete_invalid_should_fail_again(self):
        """资源删除补充-非法库区删除失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/zones/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_04_bin_delete_invalid_should_fail_again(self):
        """资源删除补充-非法库位删除失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/bin-locations/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))

    def test_05_packaging_material_delete_invalid_should_fail_again(self):
        """资源删除补充-非法包材删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/packaging-materials/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_06_manifest_order_detail_invalid_should_fail_again(self):
        """资源删除补充-非法集运单详情失败"""
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/manifest-orders/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))
