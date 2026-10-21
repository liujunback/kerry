from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestFilesAndDocsSmoke(FunctionalBaseCase):
    def test_01_putaway_order_batch_file_invalid_should_fail(self):
        """文件与单证-非法上架单批量文件失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/putaway-order/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_02_wave_pick_list_batch_file_invalid_should_fail(self):
        """文件与单证-非法波次拣货清单批量文件失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/wave-pick-list/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_03_pick_order_batch_file_invalid_should_fail(self):
        """文件与单证-非法拣货单批量文件失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/pick-order/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_04_container_label_batch_file_invalid_should_fail(self):
        """文件与单证-非法容器标签批量文件失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/container-label/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_05_sku_label_batch_file_invalid_should_fail(self):
        """文件与单证-非法SKU标签批量文件失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/sku-label/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_06_bin_location_label_batch_file_invalid_should_fail(self):
        """文件与单证-非法库位标签批量文件失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/bin-location-label/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_07_putaway_order_single_file_invalid_should_fail(self):
        """文件与单证-非法上架单单文件失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/putaway-order/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_08_wave_pick_list_single_file_invalid_should_fail(self):
        """文件与单证-非法波次拣货清单单文件失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/wave-pick-list/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_09_container_label_single_file_invalid_should_fail(self):
        """文件与单证-非法容器标签单文件失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/container-label/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_10_bin_location_label_single_file_invalid_should_fail(self):
        """文件与单证-非法库位标签单文件失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/bin-location-label/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))
