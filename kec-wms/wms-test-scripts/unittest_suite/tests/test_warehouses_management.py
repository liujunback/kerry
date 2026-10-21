from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestWarehousesManagement(FunctionalBaseCase):
    def test_01_list_warehouses_should_succeed(self):
        """仓库管理-仓库列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/warehouses", query={"pageSize": 10}))
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_search_existing_warehouse_should_succeed(self):
        """仓库管理-按仓库编码查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/warehouses",
                query={"search": self.base_data["warehouse_code"], "pageSize": 10},
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertGreater(len(result.get("data") or []), 0)

    def test_03_create_warehouse_should_succeed(self):
        """仓库管理-创建仓库成功"""
        warehouse_code = f"WH-{self.unique_tag[-8:]}"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/warehouses",
                data={
                    "warehouseCode": warehouse_code,
                    "warehouseName": f"自动化仓库{self.unique_tag[-6:]}",
                    "warehouseType": "SELF_BUILT",
                    "city": "Shanghai",
                    "country": "CN",
                    "address": "Automation Address",
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertEqual(result["data"]["warehouseCode"], warehouse_code)

    def test_04_create_duplicate_warehouse_should_fail(self):
        """仓库管理-重复仓库编码创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/warehouses",
                data={
                    "warehouseCode": self.base_data["warehouse_code"],
                    "warehouseName": "重复仓库",
                    "warehouseType": "SELF_BUILT",
                },
            )
        )
        self.assertFalse(result.get("success"))
