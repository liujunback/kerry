from unittest_suite.tests.functional_base_case import FunctionalBaseCase
from common import normalize_result


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestFileVariantAdditionalMiscSmoke(FunctionalBaseCase):
    def test_01_files_shipment_label_batch_invalid_should_fail(self):
        """文件变体补充-发货标签批量非法失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/shipment-label/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_02_files_shipment_label_single_invalid_should_fail(self):
        """文件变体补充-发货标签单文件非法失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/shipment-label/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_03_files_container_label_single_invalid_token_should_fail(self):
        """文件变体补充-容器标签单文件无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/files/container-label/{INVALID_UUID}",
                query={"token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_files_sku_label_single_invalid_token_should_fail(self):
        """文件变体补充-SKU标签单文件无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/files/sku-label/{INVALID_UUID}",
                query={"token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_files_bin_label_single_invalid_token_should_fail(self):
        """文件变体补充-库位标签单文件无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/files/bin-location-label/{INVALID_UUID}",
                query={"token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_files_supplement_pick_batch_invalid_should_fail(self):
        """文件变体补充-补拣单批量文件非法失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/supplement-pick-order/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))
