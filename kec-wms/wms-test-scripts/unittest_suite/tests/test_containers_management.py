from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestContainersManagement(FunctionalBaseCase):
    def test_01_list_containers_should_succeed(self):
        """容器管理-容器列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/containers",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_create_container_should_succeed(self):
        """容器管理-创建容器成功"""
        container_code = f"CT{self.unique_tag[-10:]}"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/containers",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "containerCode": container_code,
                    "containerType": "LARGE_BOX",
                    "usage": "INBOUND",
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertEqual(result["data"]["containerCode"], container_code)

    def test_03_container_lookup_should_succeed(self):
        """容器管理-容器详情查询成功"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/containers",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        self.assertGreater(len(listed.get("data") or []), 0)
        container_id = listed["data"][0]["id"]

        detail = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/containers/{container_id}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(detail.get("success"), detail.get("message"))

    def test_04_create_container_with_invalid_warehouse_should_fail(self):
        """容器管理-非法仓库创建容器失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/containers",
                data={
                    "warehouseId": "00000000-0000-0000-0000-000000000000",
                    "containerType": "LARGE_BOX",
                    "usage": "INBOUND",
                },
            )
        )
        self.assertFalse(result.get("success"))
