from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestWaveStrategyMiscSmoke(FunctionalBaseCase):
    def test_01_wave_strategy_detail_invalid_should_fail(self):
        """波次策略扩展-非法详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/wave-strategies/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_wave_strategy_update_invalid_should_fail(self):
        """波次策略扩展-非法更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/wave-strategies/{INVALID_UUID}",
                data={"name": "invalid-strategy"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_wave_strategy_copy_invalid_should_fail(self):
        """波次策略扩展-非法复制失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/copy", data={}))
        self.assertFalse(result.get("success"))

    def test_04_wave_strategy_publish_invalid_should_fail(self):
        """波次策略扩展-非法发布失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/publish", data={}))
        self.assertFalse(result.get("success"))

    def test_05_wave_strategy_execute_invalid_should_fail(self):
        """波次策略扩展-非法执行失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/execute", data={}))
        self.assertFalse(result.get("success"))

    def test_06_wave_strategy_rollback_invalid_should_fail(self):
        """波次策略扩展-非法回滚失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/wave-strategies/{INVALID_UUID}/rollback", data={}))
        self.assertFalse(result.get("success"))

    def test_07_wave_strategy_run_detail_invalid_should_fail(self):
        """波次策略扩展-非法运行详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/wave-strategy-runs/{INVALID_UUID}", query={"page": 1, "pageSize": 20}))
        self.assertFalse(result.get("success"))
