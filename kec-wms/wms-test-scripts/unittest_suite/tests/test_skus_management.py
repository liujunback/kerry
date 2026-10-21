from common import create_test_sku, normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestSkusManagement(FunctionalBaseCase):
    def test_01_list_skus_should_succeed(self):
        """SKU管理-SKU列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/skus",
                query={"clientId": self.base_data["client_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_create_sku_should_succeed(self):
        """SKU管理-创建SKU成功"""
        result = create_test_sku(self.session, self.base_data, self.unique_tag + "SKU")
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertTrue(result["data"]["skuCode"].startswith("AUTO-SKU-"))

    def test_03_search_existing_sku_should_succeed(self):
        """SKU管理-按SKU编码查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/skus",
                query={"search": self.base_data["sku_code"], "clientId": self.base_data["client_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertGreater(len(result.get("data") or []), 0)

    def test_04_create_duplicate_sku_should_fail(self):
        """SKU管理-重复SKU编码创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/skus",
                data={
                    "clientId": self.base_data["client_id"],
                    "skuCode": self.base_data["sku_code"],
                    "skuName": "重复SKU",
                    "barcode": self.base_data["sku_code"],
                },
            )
        )
        self.assertFalse(result.get("success"))
