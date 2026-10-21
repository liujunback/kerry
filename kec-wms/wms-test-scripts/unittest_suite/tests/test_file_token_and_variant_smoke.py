from unittest_suite.tests.functional_base_case import FunctionalBaseCase
from common import normalize_result


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestFileTokenAndVariantSmoke(FunctionalBaseCase):
    def test_01_files_invalid_document_type_batch_should_fail(self):
        """文件变体-非法文档类型批量失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/invalid-doc-type/batch", query={"ids": INVALID_UUID}))
        self.assertFalse(result.get("success"))

    def test_02_files_invalid_document_type_single_should_fail(self):
        """文件变体-非法文档类型单文件失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/invalid-doc-type/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_03_files_pick_order_batch_invalid_token_should_fail(self):
        """文件变体-拣货单批量无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/files/pick-order/batch",
                query={"ids": INVALID_UUID, "token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_files_wave_pick_list_batch_invalid_token_should_fail(self):
        """文件变体-波次拣货清单批量无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/files/wave-pick-list/batch",
                query={"ids": INVALID_UUID, "token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_files_putaway_batch_invalid_token_should_fail(self):
        """文件变体-上架单批量无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/files/putaway-order/batch",
                query={"ids": INVALID_UUID, "token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_files_container_label_batch_invalid_token_should_fail(self):
        """文件变体-容器标签批量无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/files/container-label/batch",
                query={"ids": INVALID_UUID, "token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_files_sku_label_batch_invalid_token_should_fail(self):
        """文件变体-SKU标签批量无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/files/sku-label/batch",
                query={"ids": INVALID_UUID, "token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_files_bin_label_batch_invalid_token_should_fail(self):
        """文件变体-库位标签批量无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/files/bin-location-label/batch",
                query={"ids": INVALID_UUID, "token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_09_files_supplement_single_invalid_should_fail(self):
        """文件变体-补拣单单文件非法失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/supplement-pick-order/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_10_files_putaway_single_invalid_token_query_should_fail(self):
        """文件变体-上架单单文件带无效token失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/files/putaway-order/{INVALID_UUID}",
                query={"token": "invalid-token"},
            )
        )
        self.assertFalse(result.get("success"))
