from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestSortingMiscSmoke(FunctionalBaseCase):
    def test_01_sorting_walls_available_should_succeed(self):
        """分拣扩展-可用播种墙列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/sorting/walls"))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_02_sorting_active_task_invalid_should_fail(self):
        """分拣扩展-非法进行中任务查询失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/sorting/active-task",
                query={"wallId": INVALID_UUID},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_sorting_cell_detail_invalid_should_fail(self):
        """分拣扩展-非法格口明细查询失败"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/sorting/cell-detail",
                query={"sortingTaskId": INVALID_UUID, "cellCode": ""},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_sorting_start_invalid_should_fail(self):
        """分拣扩展-非法开始分拣失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting/start",
                data={"scanCode": "", "sortingWallId": ""},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_sorting_scan_sku_invalid_should_fail(self):
        """分拣扩展-非法扫描SKU失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting/scan-sku",
                data={"sortingTaskId": INVALID_UUID, "barcode": ""},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_sorting_complete_invalid_should_fail(self):
        """分拣扩展-非法完成分拣失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting/complete",
                data={"sortingTaskId": INVALID_UUID},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_sorting_complete_cell_invalid_should_fail(self):
        """分拣扩展-非法完成格口失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting/complete-cell",
                data={"sortingTaskId": INVALID_UUID, "cellCode": ""},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_sorting_cell_detail_resource_invalid_should_fail(self):
        """分拣扩展-非法格口资源详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/sorting-cells/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_09_sorting_cell_patch_invalid_should_fail(self):
        """分拣扩展-非法格口更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PATCH",
                f"/api/v1/sorting-cells/{INVALID_UUID}",
                data={"isActive": False},
            )
        )
        self.assertFalse(result.get("success"))
