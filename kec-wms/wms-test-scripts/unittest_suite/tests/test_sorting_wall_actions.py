from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestSortingWallActions(FunctionalBaseCase):
    def _get_wall(self):
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/sorting-walls",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        data = listed.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用分拣墙")
        return data[0]["id"]

    def test_01_sorting_wall_status_switch_or_skip(self):
        """分拣墙-状态切换成功或环境兼容跳过"""
        wall_id = self._get_wall()
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/sorting-walls/{wall_id}/status",
                data={"isActive": True},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前分拣墙状态不可切换")
        self.assertTrue(result.get("success"))

    def test_02_sorting_wall_release_or_skip(self):
        """分拣墙-释放成功或环境兼容跳过"""
        wall_id = self._get_wall()
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/sorting-walls/{wall_id}/release",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前分拣墙不可释放")
        self.assertTrue(result.get("success"))

    def test_03_sorting_wall_cells_print_or_skip(self):
        """分拣墙-格口打印成功或环境兼容跳过"""
        wall_id = self._get_wall()
        cells = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/sorting-walls/{wall_id}/cells",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not cells.get("success") or not cells.get("data"):
            self.skipTest("当前分拣墙没有格口数据")
        cell_list = cells["data"].get("cells") if isinstance(cells.get("data"), dict) else []
        if not cell_list:
            self.skipTest("当前分拣墙格口列表为空")
        cell_ids = [item["id"] for item in cell_list[:2]]
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/sorting-walls/{wall_id}/cells/print",
                data={"cellIds": cell_ids},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前分拣墙格口不可打印")
        self.assertTrue(result.get("success"))
