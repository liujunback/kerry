from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestExternalApiPayloadMiscSmoke(FunctionalBaseCase):
    def test_01_asn_by_number_status_with_client_should_be_restricted(self):
        """外部接口载荷补充-ASN状态带客户仍受限"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/asn/by-number/ANY-EXTERNAL-NO/status",
                query={"clientCode": self.base_data["client_code"]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_asn_by_number_cancel_with_client_should_be_restricted(self):
        """外部接口载荷补充-ASN取消带客户仍受限"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/asn/by-number/ANY-EXTERNAL-NO/cancel",
                data={"clientCode": self.base_data["client_code"], "reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_outbound_by_number_with_client_should_be_restricted(self):
        """外部接口载荷补充-出库查询带客户仍受限"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/outbound-orders/by-number/ANY-ORDER-NO",
                data={"clientCode": self.base_data["client_code"]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_outbound_by_number_cancel_with_client_should_be_restricted(self):
        """外部接口载荷补充-出库取消带客户仍受限"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/outbound-orders/by-number/ANY-ORDER-NO/cancel",
                data={"clientCode": self.base_data["client_code"], "reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_sku_by_code_with_client_should_be_restricted_again(self):
        """外部接口载荷补充-SKU按编码带客户仍受限"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/skus/by-code/{self.base_data['sku_code']}",
                query={"clientCode": self.base_data["client_code"]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_sku_by_code_update_with_client_should_be_restricted_again(self):
        """外部接口载荷补充-SKU按编码更新带客户仍受限"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/skus/by-code/{self.base_data['sku_code']}",
                data={"clientCode": self.base_data["client_code"], "skuName": "restricted-update-again"},
            )
        )
        self.assertFalse(result.get("success"))
