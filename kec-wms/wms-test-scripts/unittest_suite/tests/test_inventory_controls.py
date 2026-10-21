from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestInventoryControls(FunctionalBaseCase):
    def _get_inventory_item(self):
        inventory = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory",
                query={
                    "warehouseId": self.base_data["warehouse_id"],
                    "skuCode": self.base_data["sku_code"],
                    "pageSize": 10,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(inventory.get("success"), inventory.get("message"))
        data = inventory.get("data") or []
        if not data:
            self.skipTest("当前环境没有可用库存，跳过库存控制成功用例")
        return data[0]

    def _get_alternate_location_id(self, current_location_id: str):
        bins = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/bin-locations",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 100},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(bins.get("success"), bins.get("message"))
        for item in bins.get("data") or []:
            if item.get("id") != current_location_id and item.get("status") == "ACTIVE":
                return item.get("id")
        self.skipTest("当前环境没有可用的目标库位")

    def test_01_adjustment_list_should_succeed(self):
        """库存控制-调整单列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/adjustments",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))

    def test_02_create_quantity_adjustment_should_succeed(self):
        """库存控制-创建数量调整单成功"""
        item = self._get_inventory_item()
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/inventory/adjustments",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "adjustmentType": "QUANTITY_ADJUST",
                    "reason": "自动化数量调整",
                    "lines": [
                        {
                            "inventoryId": item["id"],
                            "skuId": item["sku"]["id"],
                            "locationId": item["location"]["id"],
                            "bucketType": item.get("bucketType") or "AVAILABLE",
                            "adjustQuantity": 1,
                            "reason": "自动化数量调整明细",
                        }
                    ],
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))

    def test_03_transfer_list_should_succeed(self):
        """库存控制-转移单列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/transfers",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("data") is not None or result.get("success"), result.get("message"))

    def test_04_create_transfer_should_succeed(self):
        """库存控制-创建转移单成功"""
        item = self._get_inventory_item()
        target_location_id = self._get_alternate_location_id(item["location"]["id"])
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/inventory/transfers",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "transferType": "BIN_TRANSFER",
                    "reason": "自动化库位转移",
                    "lines": [
                        {
                            "skuId": item["sku"]["id"],
                            "sourceLocationId": item["location"]["id"],
                            "targetLocationId": target_location_id,
                            "quantity": 1,
                            "reason": "自动化转移明细",
                        }
                    ],
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("data") is not None or result.get("success"), result.get("message"))

    def test_05_freeze_list_should_succeed(self):
        """库存控制-冻结列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/freezes",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("data") is not None or result.get("success"), result.get("message"))

    def test_06_create_freeze_should_succeed(self):
        """库存控制-创建冻结成功"""
        item = self._get_inventory_item()
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/inventory/freezes",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "freezeType": "MANUAL_HOLD",
                    "reason": "自动化冻结",
                    "lines": [
                        {
                            "inventoryId": item["id"],
                            "skuId": item["sku"]["id"],
                            "locationId": item["location"]["id"],
                            "quantity": 1,
                            "reason": "自动化冻结明细",
                        }
                    ],
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("data") is not None or result.get("success"), result.get("message"))

    def test_07_create_transfer_same_location_should_fail(self):
        """库存控制-相同源目标库位转移失败"""
        item = self._get_inventory_item()
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/inventory/transfers",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "transferType": "BIN_TRANSFER",
                    "reason": "非法转移",
                    "lines": [
                        {
                            "skuId": item["sku"]["id"],
                            "sourceLocationId": item["location"]["id"],
                            "targetLocationId": item["location"]["id"],
                            "quantity": 1,
                        }
                    ],
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
