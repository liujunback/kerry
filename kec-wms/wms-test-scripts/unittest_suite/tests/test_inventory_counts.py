from datetime import datetime, timedelta

from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestInventoryCounts(FunctionalBaseCase):
    def test_01_list_inventory_counts_should_succeed(self):
        """盘点单-列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/counts",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_create_inventory_count_should_succeed(self):
        """盘点单-创建草稿成功"""
        planned_at = (datetime.utcnow() + timedelta(days=1)).replace(microsecond=0).isoformat() + "Z"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/inventory/counts",
                data={
                    "saveMode": "DRAFT",
                    "orderName": f"自动化盘点{self.unique_tag[-6:]}",
                    "orderType": "FULL",
                    "countMode": "BLIND",
                    "warehouseId": self.base_data["warehouse_id"],
                    "plannedAt": planned_at,
                    "ownerScopeMode": "ALL",
                    "clientIds": [],
                    "scopeConfig": {
                        "inventoryStatuses": ["AVAILABLE"],
                        "maxLocationsPerBatch": 10,
                    },
                    "executionConfig": {
                        "splitRule": "BY_LOCATION",
                        "allowPrint": False,
                        "pdaMode": "BLIND",
                    },
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))

    def test_03_partial_scope_without_clients_should_fail(self):
        """盘点单-指定货主但未选客户失败"""
        planned_at = (datetime.utcnow() + timedelta(days=1)).replace(microsecond=0).isoformat() + "Z"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/inventory/counts",
                data={
                    "saveMode": "DRAFT",
                    "orderName": f"非法盘点{self.unique_tag[-6:]}",
                    "orderType": "FULL",
                    "countMode": "BLIND",
                    "warehouseId": self.base_data["warehouse_id"],
                    "plannedAt": planned_at,
                    "ownerScopeMode": "PARTIAL",
                    "clientIds": [],
                    "scopeConfig": {
                        "inventoryStatuses": ["AVAILABLE"],
                        "maxLocationsPerBatch": 10,
                    },
                    "executionConfig": {
                        "splitRule": "BY_LOCATION",
                        "allowPrint": False,
                        "pdaMode": "BLIND",
                    },
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
