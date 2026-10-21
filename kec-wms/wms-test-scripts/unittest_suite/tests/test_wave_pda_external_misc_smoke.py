from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestWavePdaExternalMiscSmoke(FunctionalBaseCase):
    def test_01_wave_strategy_detail_invalid_should_fail(self):
        """波次与PDA补充-非法波次策略详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/wave-strategies/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_wave_strategy_update_invalid_should_fail(self):
        """波次与PDA补充-非法波次策略更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/wave-strategies/{INVALID_UUID}",
                data={"name": "invalid-wave-strategy"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_wave_strategy_copy_invalid_should_fail(self):
        """波次与PDA补充-非法波次策略复制失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/copy", data={}))
        self.assertFalse(result.get("success"))

    def test_04_wave_strategy_publish_invalid_should_fail(self):
        """波次与PDA补充-非法波次策略发布失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/publish", data={}))
        self.assertFalse(result.get("success"))

    def test_05_wave_strategy_execute_invalid_should_fail(self):
        """波次与PDA补充-非法波次策略执行失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/execute", data={}))
        self.assertFalse(result.get("success"))

    def test_06_wave_strategy_rollback_invalid_should_fail(self):
        """波次与PDA补充-非法波次策略回滚失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/rollback", data={}))
        self.assertFalse(result.get("success"))

    def test_07_wave_strategy_run_detail_invalid_should_fail(self):
        """波次与PDA补充-非法波次策略运行详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/wave-strategy-runs/{INVALID_UUID}", query={"page": 1, "pageSize": 20}))
        self.assertFalse(result.get("success"))

    def test_08_pda_download_link_should_succeed(self):
        """波次与PDA补充-PDA下载链接成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/pda/download-link"))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_09_pda_asn_sign_in_missing_body_should_fail(self):
        """波次与PDA补充-PDA ASN签收缺参失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/pda/asn/sign-in", data={}))
        self.assertFalse(result.get("success"))

    def test_10_pda_asn_sign_in_invalid_number_should_fail(self):
        """波次与PDA补充-PDA ASN签收非法单号失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/pda/asn/sign-in",
                data={"asnNumber": "INVALID-ASN-NO"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_11_asn_by_number_status_missing_client_should_fail(self):
        """波次与PDA补充-外部ASN状态缺少客户失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/asn/by-number/ANY-EXTERNAL-NO/status"))
        self.assertFalse(result.get("success"))

    def test_12_asn_by_number_cancel_missing_client_should_fail(self):
        """波次与PDA补充-外部ASN取消缺少客户失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/asn/by-number/ANY-EXTERNAL-NO/cancel",
                data={"reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_13_outbound_by_number_missing_client_should_fail(self):
        """波次与PDA补充-外部出库查询缺少客户失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/outbound-orders/by-number/ANY-ORDER-NO"))
        self.assertFalse(result.get("success"))

    def test_14_outbound_by_number_cancel_missing_client_should_fail(self):
        """波次与PDA补充-外部出库取消缺少客户失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/outbound-orders/by-number/ANY-ORDER-NO/cancel",
                data={"reason": "test"},
            )
        )
        self.assertFalse(result.get("success"))
