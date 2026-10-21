from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestApiValidationSmoke(FunctionalBaseCase):
    def test_01_invalid_client_payload_should_fail(self):
        """参数校验-非法客户创建失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/clients", data={"clientCode": "", "clientName": ""}))
        self.assertFalse(result.get("success"))

    def test_02_invalid_warehouse_payload_should_fail(self):
        """参数校验-非法仓库创建失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/warehouses", data={"warehouseCode": "", "warehouseName": ""}))
        self.assertFalse(result.get("success"))

    def test_03_invalid_sku_payload_should_fail(self):
        """参数校验-非法SKU创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/skus",
                data={"clientId": self.base_data["client_id"], "skuCode": "", "skuName": ""},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_invalid_user_payload_should_fail(self):
        """参数校验-非法用户创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/users",
                data={"username": "a", "fullName": "", "userType": "INTERNAL", "password": "123"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_invalid_role_payload_should_fail(self):
        """参数校验-非法角色创建失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/roles", data={"roleCode": "a", "roleName": ""}))
        self.assertFalse(result.get("success"))

    def test_06_invalid_container_payload_should_fail(self):
        """参数校验-非法容器创建失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/containers", data={"warehouseId": "", "containerType": "", "usage": ""}))
        self.assertFalse(result.get("success"))

    def test_07_invalid_sorting_wall_payload_should_fail(self):
        """参数校验-非法分拣墙创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/sorting-walls",
                data={"warehouseId": self.base_data["warehouse_id"], "wallCode": "", "wallName": "", "horizontalCells": 0, "verticalCells": 0},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_invalid_print_template_payload_should_fail(self):
        """参数校验-非法打印模板创建失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/print-templates", data={"name": "", "scenarioType": "", "labelSpecCode": ""}))
        self.assertFalse(result.get("success"))

    def test_09_invalid_inventory_count_payload_should_fail(self):
        """参数校验-非法盘点单创建失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/inventory/counts", data={"warehouseId": ""}))
        self.assertFalse(result.get("success"))

    def test_10_invalid_adjustment_payload_should_fail(self):
        """参数校验-非法调整单创建失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/inventory/adjustments", data={"warehouseId": ""}))
        self.assertFalse(result.get("success"))
