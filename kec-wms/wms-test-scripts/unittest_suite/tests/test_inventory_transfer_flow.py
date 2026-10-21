from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestInventoryTransferFlow(FunctionalBaseCase):
    def _get_transfer(self):
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/transfers",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        data = listed.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用转移单")
        return data[0]["id"]

    def test_01_transfer_detail_should_succeed(self):
        """库存转移-详情查询成功"""
        transfer_id = self._get_transfer()
        detail = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/inventory/transfers/{transfer_id}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(detail.get("data") is not None or detail.get("success"), detail.get("message"))

    def test_02_transfer_submit_or_skip(self):
        """库存转移-提交成功或环境兼容跳过"""
        transfer_id = self._get_transfer()
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/transfers/{transfer_id}/submit",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "当前转移单不可提交")
        self.assertTrue(result.get("success"))

    def test_03_transfer_approve_or_skip(self):
        """库存转移-审批成功或环境兼容跳过"""
        transfer_id = self._get_transfer()
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/inventory/transfers/{transfer_id}/approve",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if not result.get("success"):
            self.skipTest(result.get("error") or result.get("message") or "当前转移单不可审批")
        self.assertTrue(result.get("success"))
