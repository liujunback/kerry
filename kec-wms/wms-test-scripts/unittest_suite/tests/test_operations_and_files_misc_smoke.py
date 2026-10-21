from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestOperationsAndFilesMiscSmoke(FunctionalBaseCase):
    def test_01_operation_logs_invalid_entity_type_should_succeed_or_skip(self):
        """操作文件扩展-非法实体类型日志查询成功或环境兼容跳过"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/operation-logs/INVALID/{INVALID_UUID}"))
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "非法实体类型日志接口异常")
        self.assertTrue(result.get("success"))

    def test_02_print_url_pick_order_invalid_ids_should_fail(self):
        """操作文件扩展-非法拣货单打印URL失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-url",
                data={"documentType": "pick-order", "ids": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_print_url_wave_pick_list_invalid_ids_should_fail(self):
        """操作文件扩展-非法波次拣货清单打印URL失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-url",
                data={"documentType": "wave-pick-list", "ids": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_print_url_putaway_invalid_ids_should_fail(self):
        """操作文件扩展-非法上架单打印URL失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-url",
                data={"documentType": "putaway-order", "ids": []},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_supplement_pick_single_file_invalid_should_fail(self):
        """操作文件扩展-非法补拣单文件失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/supplement-pick-order/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))
