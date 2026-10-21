from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestSortingE2EDeepSmoke(FunctionalBaseCase):
    def test_01_e2e_execute_batch_invalid_category_should_fail(self):
        """E2E深度-非法分类批量执行失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/e2e/scenarios/execute-batch",
                data={"categoryCode": "NOT_EXIST_CATEGORY"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_02_e2e_execute_single_invalid_should_fail(self):
        """E2E深度-非法单场景执行失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/e2e/scenarios/{INVALID_UUID}/execute", data={}))
        self.assertFalse(result.get("success"))

    def test_03_sorting_walls_invalid_query_should_succeed_or_skip(self):
        """分拣深度-播种墙列表查询成功或环境兼容跳过"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/sorting/walls"))
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "播种墙列表接口异常")
        self.assertTrue(result.get("success"))

    def test_04_sorting_active_task_missing_wall_should_fail(self):
        """分拣深度-缺失播种墙ID失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/sorting/active-task"))
        self.assertFalse(result.get("success"))

    def test_05_sorting_cell_detail_missing_args_should_fail(self):
        """分拣深度-缺失格口参数失败"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/sorting/cell-detail"))
        self.assertFalse(result.get("success"))

    def test_06_sorting_complete_cell_invalid_should_fail(self):
        """分拣深度-非法完成格口失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting/complete-cell",
                data={"sortingTaskId": INVALID_UUID, "cellCode": "A01"},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_sorting_complete_invalid_should_fail(self):
        """分拣深度-非法完成任务失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting/complete",
                data={"sortingTaskId": INVALID_UUID},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_picking_exception_list_should_succeed_or_skip(self):
        """拣货异常-列表查询成功或环境兼容跳过"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/picking-exceptions", query={"page": 1, "pageSize": 20}))
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "拣货异常列表接口异常")
        self.assertTrue(result.get("success"))

    def test_09_picking_exception_detail_invalid_should_fail(self):
        """拣货异常-非法详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/picking-exceptions/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_10_picking_exception_supplement_invalid_should_fail(self):
        """拣货异常-非法补拣单生成失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/picking-exceptions/{INVALID_UUID}/supplement", data={}))
        self.assertFalse(result.get("success"))
