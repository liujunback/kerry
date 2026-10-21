from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestSchedulerDeviceMiscSmoke(FunctionalBaseCase):
    def test_01_scheduled_task_detail_invalid_should_fail(self):
        """调度与设备-非法定时任务详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/scheduled-tasks/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_print_device_detail_invalid_should_fail(self):
        """调度与设备-非法打印设备详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/print-devices/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_03_print_template_detail_invalid_should_fail(self):
        """调度与设备-非法打印模板详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/print-templates/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_print_label_spec_detail_invalid_should_fail(self):
        """调度与设备-非法标签规格详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/print-label-specs/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_05_api_key_delete_invalid_should_fail(self):
        """调度与设备-非法API Key删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/api-keys/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_06_api_key_patch_invalid_should_fail(self):
        """调度与设备-非法API Key更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PATCH",
                f"/api/v1/api-keys/{INVALID_UUID}",
                data={"name": "Updated Key"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_job_detail_invalid_should_fail(self):
        """调度与设备-非法任务详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/jobs/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))
