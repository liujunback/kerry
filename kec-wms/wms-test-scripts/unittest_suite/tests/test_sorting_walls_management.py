from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestSortingWallsManagement(FunctionalBaseCase):
    def test_01_list_sorting_walls_should_succeed(self):
        """分拣墙-列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/sorting-walls",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_create_sorting_wall_should_succeed(self):
        """分拣墙-创建成功"""
        wall_code = f"AUTO-WALL-{self.unique_tag[-6:]}"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting-walls",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "wallCode": wall_code,
                    "wallName": f"自动化分拣墙{self.unique_tag[-4:]}",
                    "workstationCode": f"WS-{self.unique_tag[-4:]}",
                    "horizontalCells": 2,
                    "verticalCells": 2,
                    "locationCode": "999.99.99",
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertEqual(result["data"]["wallCode"], wall_code)

    def test_03_create_duplicate_sorting_wall_should_fail(self):
        """分拣墙-重复编码创建失败"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/sorting-walls",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        self.assertGreater(len(listed.get("data") or []), 0)
        existing_code = listed["data"][0]["wallCode"]

        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting-walls",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "wallCode": existing_code,
                    "wallName": "重复分拣墙",
                    "horizontalCells": 2,
                    "verticalCells": 2,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
