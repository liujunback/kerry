from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestMoreExternalRestrictionsSmoke(FunctionalBaseCase):
    def test_01_asn_by_number_status_missing_client_should_fail(self):
        """外部接口补充-ASN状态缺少客户失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/asn/by-number/ANY-EXTERNAL-NO/status"))
        self.assertFalse(result.get("success"))

    def test_02_asn_by_number_cancel_missing_client_should_fail(self):
        """外部接口补充-ASN取消缺少客户失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/asn/by-number/ANY-EXTERNAL-NO/cancel",
                data={"reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_outbound_by_number_missing_client_should_fail(self):
        """外部接口补充-出库查询缺少客户失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/outbound-orders/by-number/ANY-ORDER-NO"))
        self.assertFalse(result.get("success"))

    def test_04_outbound_by_number_cancel_missing_client_should_fail(self):
        """外部接口补充-出库取消缺少客户失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/outbound-orders/by-number/ANY-ORDER-NO/cancel",
                data={"reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))
