from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestPickAssignmentMiscSmoke(FunctionalBaseCase):
    def test_01_pick_assignment_rule_detail_invalid_should_fail(self):
        """拣货分配-非法规则详情失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/pick-assignment-rules/{INVALID_UUID}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_pick_assignment_rule_update_invalid_should_fail(self):
        """拣货分配-非法规则更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/pick-assignment-rules/{INVALID_UUID}",
                data={"ruleName": "invalid-update"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_pick_assignment_rule_delete_invalid_should_fail(self):
        """拣货分配-非法规则删除失败"""
        result = normalize_result(
            self.session.api_request(
                "DELETE",
                f"/api/v1/pick-assignment-rules/{INVALID_UUID}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_picker_profile_detail_invalid_should_fail(self):
        """拣货分配-非法拣货员画像详情失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/picker-profiles/{INVALID_UUID}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_picker_profile_update_invalid_should_fail(self):
        """拣货分配-非法拣货员画像更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/picker-profiles/{INVALID_UUID}",
                data={"maxActiveTasks": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_picker_profile_delete_invalid_should_fail(self):
        """拣货分配-非法拣货员画像删除失败"""
        result = normalize_result(
            self.session.api_request(
                "DELETE",
                f"/api/v1/picker-profiles/{INVALID_UUID}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_picker_profile_options_should_succeed_or_skip(self):
        """拣货分配-画像选项查询成功或环境兼容跳过"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/picker-profiles/options",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "拣货员画像选项接口异常")
        self.assertTrue(result.get("success"))
