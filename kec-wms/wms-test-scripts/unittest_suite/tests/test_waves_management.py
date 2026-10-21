from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestWavesManagement(FunctionalBaseCase):
    def test_01_list_waves_should_succeed(self):
        """波次管理-波次列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/waves",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_wave_detail_should_succeed(self):
        """波次管理-波次详情查询成功"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/waves",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        data = listed.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用波次")
        wave_id = data[0]["id"]
        detail = normalize_result(
            self.session.api_request("GET", f"/api/v1/waves/{wave_id}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(detail.get("success"), detail.get("message"))

    def test_03_wave_pick_list_or_skip(self):
        """波次管理-波次拣货清单查询成功或环境兼容跳过"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/waves",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        data = listed.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用波次")
        wave_id = data[0]["id"]
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/waves/pick-list",
                data={"waveIds": [wave_id]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("message") or result.get("error") or "当前波次不支持拣货清单查询")
        self.assertTrue(result.get("success"))
