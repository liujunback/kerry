from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestPackingShelvingDeepSmoke(FunctionalBaseCase):
    def test_01_packing_lookup_invalid_should_fail(self):
        """打包上架深度-非法打包查询失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/packing/lookup",
                query={"scanCode": "INVALID-SCAN-CODE"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_packing_start_invalid_should_fail(self):
        """打包上架深度-非法开始打包失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/packing/{INVALID_UUID}/start",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_packing_complete_invalid_should_fail(self):
        """打包上架深度-非法完成打包失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/packing/{INVALID_UUID}/complete",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_packing_complete_order_invalid_should_fail(self):
        """打包上架深度-非法完成订单打包失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/packing/{INVALID_UUID}/complete-order",
                data={"orderId": INVALID_UUID, "packagingMaterials": [], "weight": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_packing_scan_sku_invalid_should_fail(self):
        """打包上架深度-非法扫描SKU失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/packing/{INVALID_UUID}/scan-sku",
                data={"orderId": INVALID_UUID, "barcode": "INVALID", "quantity": 1, "serialNumbers": []},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_packing_videos_query_invalid_should_return_empty(self):
        """打包上架深度-非法视频查询返回空列表"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/packing/videos",
                query={"orderId": INVALID_UUID},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertEqual(result.get("data"), [])

    def test_07_packing_videos_download_invalid_should_fail(self):
        """打包上架深度-非法视频下载失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/packing/videos/download",
                query={"orderId": INVALID_UUID, "jobId": INVALID_UUID, "cameraId": "INVALID"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_shelving_putaway_order_invalid_should_fail(self):
        """打包上架深度-非法上架单查询失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/shelving/putaway-order",
                query={"orderNumber": "INVALID-PUTAWAY-ORDER"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_09_shelving_sku_invalid_should_fail(self):
        """打包上架深度-非法SKU查询失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/shelving/sku",
                query={"barcode": "INVALID-BARCODE"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_10_shelving_sku_serial_numbers_invalid_should_return_empty(self):
        """打包上架深度-非法SKU序列号查询返回空列表"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/shelving/sku/serial-numbers",
                query={"skuId": INVALID_UUID, "warehouseId": self.base_data["warehouse_id"], "putawayOrderId": INVALID_UUID},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertEqual(result.get("data"), [])

    def test_11_shelving_location_invalid_should_fail(self):
        """打包上架深度-非法库位查询失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/shelving/location",
                query={"locationCode": "INVALID-LOC", "warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_12_shelving_container_invalid_should_fail(self):
        """打包上架深度-非法容器查询失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/shelving/container",
                query={"containerCode": "INVALID-CONTAINER", "warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_13_shelving_submit_invalid_should_fail(self):
        """打包上架深度-非法上架提交失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/shelving",
                data={"putawayOrderId": INVALID_UUID, "locationId": INVALID_UUID, "items": []},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
