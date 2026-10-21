from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestExternalApiRestrictionSmoke(FunctionalBaseCase):
    def test_01_asn_by_number_status_should_be_restricted(self):
        """外部接口受限-ASN状态查询受限"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/asn/by-number/INVALID-ASN-NO/status",
                query={"clientCode": self.base_data["client_code"]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_asn_by_number_cancel_should_be_restricted(self):
        """外部接口受限-ASN取消受限"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/asn/by-number/INVALID-ASN-NO/cancel",
                data={"clientCode": self.base_data["client_code"], "reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_outbound_by_number_should_be_restricted(self):
        """外部接口受限-出库按单号查询受限"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/outbound-orders/by-number/INVALID-ORDER-NO",
                data={"clientCode": self.base_data["client_code"]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_outbound_by_number_cancel_should_be_restricted(self):
        """外部接口受限-出库按单号取消受限"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/outbound-orders/by-number/INVALID-ORDER-NO/cancel",
                data={"clientCode": self.base_data["client_code"], "reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))
