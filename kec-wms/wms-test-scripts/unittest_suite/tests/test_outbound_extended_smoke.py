from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestOutboundExtendedSmoke(FunctionalBaseCase):
    def _list_orders(self):
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/outbound-orders",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        items = result.get("data") or []
        if not items:
            self.skipTest("当前环境没有可用出库订单")
        return items

    def test_01_outbound_list_should_succeed(self):
        """出库扩展-订单列表查询成功"""
        items = self._list_orders()
        self.assertGreater(len(items), 0)

    def test_02_outbound_detail_should_succeed(self):
        """出库扩展-订单详情查询成功"""
        order = self._list_orders()[0]
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/outbound-orders/{order['id']}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_03_outbound_serial_numbers_should_succeed(self):
        """出库扩展-订单序列号查询成功"""
        order = self._list_orders()[0]
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/outbound-orders/{order['id']}/serial-numbers",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_04_outbound_by_external_number_should_be_restricted(self):
        """出库扩展-按外部单号查询受限"""
        orders = self._list_orders()
        order = next((item for item in orders if item.get("referenceNumber")), None)
        if not order:
            self.skipTest("当前环境没有可用于按外部单号查询的订单")
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/outbound-orders/by-number/{order['referenceNumber']}",
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_outbound_rollback_invalid_should_fail(self):
        """出库扩展-非法订单回退失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/outbound-orders/{INVALID_UUID}/rollback",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_outbound_batch_rollback_invalid_should_fail(self):
        """出库扩展-非法批量回退失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/outbound-orders/batch-rollback",
                data={"orderIds": [INVALID_UUID]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_outbound_cancel_by_external_number_invalid_should_fail(self):
        """出库扩展-非法外部单号取消失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/outbound-orders/by-number/INVALID-ORDER-NO/cancel",
                data={},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_outbound_detail_invalid_should_fail(self):
        """出库扩展-非法订单详情失败"""
        result = normalize_result(
            self.session.api_request("GET", f"/api/v1/outbound-orders/{INVALID_UUID}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertFalse(result.get("success"))
