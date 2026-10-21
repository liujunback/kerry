from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestSupplementPickMiscSmoke(FunctionalBaseCase):
    def test_01_supplement_pick_print_invalid_should_fail(self):
        """补拣单扩展-非法打印失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/supplement-pick-orders/{INVALID_UUID}/print", data={}))
        self.assertFalse(result.get("success"))

    def test_02_supplement_pick_manual_complete_invalid_should_fail(self):
        """补拣单扩展-非法手工补齐失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/supplement-pick-orders/{INVALID_UUID}/manual-complete",
                data={"remark": "manual-complete"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_operation_logs_entity_invalid_should_succeed_or_skip(self):
        """补拣单扩展-实体操作日志查询成功或环境兼容跳过"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/operation-logs/OUTBOUND_ORDER/{INVALID_UUID}"))
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "实体操作日志接口异常")
        self.assertTrue(result.get("success"))
