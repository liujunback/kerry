from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestPdaMiscSmoke(FunctionalBaseCase):
    def test_01_pda_download_link_should_succeed(self):
        """PDA模块-下载二维码成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/pda/download-link"))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_02_pda_asn_sign_in_missing_body_should_fail(self):
        """PDA模块-ASN签收缺参失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/pda/asn/sign-in", data={}))
        self.assertFalse(result.get("success"))

    def test_03_pda_asn_sign_in_invalid_number_should_fail(self):
        """PDA模块-ASN签收非法单号失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/pda/asn/sign-in",
                data={"asnNumber": "INVALID-ASN-NO"},
            )
        )
        self.assertFalse(result.get("success"))
