from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestContainerMiscSmoke(FunctionalBaseCase):
    def test_01_container_generate_code_should_succeed(self):
        """容器扩展-生成编码成功"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/containers/generate-code",
                data={"containerType": "LARGE_BOX", "usage": "INBOUND"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_02_container_batch_create_invalid_should_fail(self):
        """容器扩展-非法批量创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/containers/batch",
                data={"warehouseId": "", "containerType": "", "usage": "", "quantity": 0},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_container_batch_status_invalid_should_fail(self):
        """容器扩展-非法批量状态修改失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                "/api/v1/containers/batch/status",
                data={"containerIds": [], "enabledStatus": "ENABLED"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_container_status_put_invalid_should_fail(self):
        """容器扩展-非法启用状态修改失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/containers/{INVALID_UUID}/status",
                data={"enabledStatus": "DISABLED"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_container_status_patch_invalid_should_fail(self):
        """容器扩展-非法工作状态修改失败"""
        result = normalize_result(
            self.session.api_request(
                "PATCH",
                f"/api/v1/containers/{INVALID_UUID}/status",
                data={"workStatus": "IDLE"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
