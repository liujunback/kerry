from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestJobAndSystemSmoke(FunctionalBaseCase):
    def test_01_api_keys_list_should_succeed(self):
        """系统杂项-API Keys列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/api-keys", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_02_api_key_detail_invalid_should_fail(self):
        """系统杂项-非法API Key详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/api-keys/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_03_scheduled_task_handlers_should_succeed(self):
        """系统杂项-定时任务处理器列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/scheduled-tasks/handlers"))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_04_scheduled_task_trigger_invalid_should_fail(self):
        """系统杂项-非法定时任务触发失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/scheduled-tasks/{INVALID_UUID}/trigger", data={}))
        self.assertFalse(result.get("success"))

    def test_05_job_cancel_invalid_should_fail(self):
        """系统杂项-非法任务取消失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/jobs/{INVALID_UUID}/cancel", data={}))
        self.assertFalse(result.get("success"))

    def test_06_job_retry_invalid_should_fail(self):
        """系统杂项-非法任务重试失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/jobs/{INVALID_UUID}/retry", data={}))
        self.assertFalse(result.get("success"))

    def test_07_job_download_invalid_should_fail(self):
        """系统杂项-非法任务下载失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/jobs/{INVALID_UUID}/download"))
        self.assertFalse(result.get("success"))

    def test_08_print_device_test_invalid_should_fail(self):
        """系统杂项-非法打印设备测试失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/print-devices/{INVALID_UUID}/test", data={}))
        self.assertFalse(result.get("success"))

    def test_09_files_batch_invalid_should_fail(self):
        """系统杂项-非法批量文件下载失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/files/pick-order/batch", query={"ids": ""}))
        self.assertFalse(result.get("success"))

    def test_10_files_single_invalid_should_fail(self):
        """系统杂项-非法单文件下载失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/files/pick-order/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))
