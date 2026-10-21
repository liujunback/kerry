from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestInventoryCountDeepSmoke(FunctionalBaseCase):
    def test_01_count_generate_invalid_should_fail(self):
        """盘点深度-非法生成失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/generate",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_count_cancel_invalid_should_fail(self):
        """盘点深度-非法取消失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/cancel",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_count_settle_invalid_should_fail(self):
        """盘点深度-非法结算失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/settle",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_count_lines_submit_invalid_should_fail(self):
        """盘点深度-非法盘点行提交失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/lines/submit",
                data={"lines": []},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_count_differences_confirm_invalid_should_fail(self):
        """盘点深度-非法差异确认失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/differences/confirm",
                data={"differenceIds": []},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_count_recounts_generate_invalid_should_fail(self):
        """盘点深度-非法复盘生成失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/recounts/generate",
                data={"differenceIds": []},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_count_batches_assignees_invalid_should_fail(self):
        """盘点深度-非法批次分配失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/batches/assignees",
                data={"batchIds": [], "userIds": []},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_count_batch_start_invalid_should_fail(self):
        """盘点深度-非法批次开始失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/batches/{INVALID_UUID}/start",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_09_count_batch_complete_invalid_should_fail(self):
        """盘点深度-非法批次完成失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/batches/{INVALID_UUID}/complete",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_10_count_batch_assignee_invalid_should_fail(self):
        """盘点深度-非法批次指派失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/batches/{INVALID_UUID}/assignee",
                data={"userId": INVALID_UUID},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_11_count_batch_lines_submit_invalid_should_fail(self):
        """盘点深度-非法批次行提交失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/batches/{INVALID_UUID}/lines/submit",
                data={"lines": []},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_12_count_disposal_start_invalid_should_fail(self):
        """盘点深度-非法差异处置开始失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/disposals/{INVALID_UUID}/start",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_13_count_disposal_complete_invalid_should_fail(self):
        """盘点深度-非法差异处置完成失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/counts/{INVALID_UUID}/disposals/{INVALID_UUID}/complete",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
