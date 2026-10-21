from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestReturnsDeepSmoke(FunctionalBaseCase):
    def test_01_returns_dispositions_invalid_should_fail(self):
        """退件深度-非法处置失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/returns/{INVALID_UUID}/dispositions",
                data={"items": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_returns_by_number_dispositions_invalid_should_fail(self):
        """退件深度-非法单号处置失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/returns/by-number/INVALID-RETURN-NO/dispositions",
                data={"items": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_returns_photos_invalid_should_fail(self):
        """退件深度-非法图片上传失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/returns/photos",
                data={"returnId": INVALID_UUID, "photos": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_returns_putaway_orders_create_invalid_should_fail(self):
        """退件深度-非法退件上架单创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/returns/putaway/orders",
                data={"returnIds": [], "warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_returns_sign_in_lookup_invalid_should_fail(self):
        """退件深度-非法签收查询失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/returns/sign-in/lookup",
                data={"logisticsNo": "", "warehouseId": ""},
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_returns_counting_lookup_invalid_should_fail(self):
        """退件深度-非法清点查询失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/returns/counting/lookup",
                data={"logisticsNo": "", "warehouseId": ""},
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_returns_detail_invalid_should_fail(self):
        """退件深度-非法详情查询失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/returns/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))
