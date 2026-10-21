from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestSchedulerDetailCrudMiscSmoke(FunctionalBaseCase):
    def test_01_scheduled_task_detail_invalid_should_fail_again(self):
        """调度深度-非法定时任务详情再次失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/scheduled-tasks/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_scheduled_task_update_invalid_should_fail_again(self):
        """调度深度-非法定时任务更新再次失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/scheduled-tasks/{INVALID_UUID}",
                data={"taskName": "invalid-task-again"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_scheduled_task_delete_invalid_should_fail_again(self):
        """调度深度-非法定时任务删除再次失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/scheduled-tasks/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_scheduled_task_trigger_invalid_should_fail_again(self):
        """调度深度-非法定时任务触发再次失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/scheduled-tasks/{INVALID_UUID}/trigger", data={}))
        self.assertFalse(result.get("success"))

    def test_05_scheduled_task_handlers_should_succeed_again(self):
        """调度深度-处理器列表再次成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/scheduled-tasks/handlers"))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

