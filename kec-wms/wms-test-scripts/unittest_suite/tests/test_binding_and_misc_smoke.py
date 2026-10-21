from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestBindingAndMiscSmoke(FunctionalBaseCase):
    def test_01_client_status_invalid_should_fail(self):
        """绑定杂项-非法客户状态修改失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/clients/{INVALID_UUID}/status", data={"isActive": False})
        )
        self.assertFalse(result.get("success"))

    def test_02_client_warehouse_update_invalid_should_fail(self):
        """绑定杂项-非法客户仓库关联更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/clients/{INVALID_UUID}/warehouses/{INVALID_UUID}",
                data={"isDefault": True},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_client_warehouse_delete_invalid_should_fail(self):
        """绑定杂项-非法客户仓库关联删除失败"""
        result = normalize_result(
            self.session.api_request("DELETE", f"/api/v1/clients/{INVALID_UUID}/warehouses/{INVALID_UUID}")
        )
        self.assertFalse(result.get("success"))

    def test_04_warehouse_status_invalid_should_fail(self):
        """绑定杂项-非法仓库状态修改失败"""
        result = normalize_result(
            self.session.api_request("PUT", f"/api/v1/warehouses/{INVALID_UUID}/status", data={"status": "INACTIVE"})
        )
        self.assertFalse(result.get("success"))

    def test_05_sku_by_code_should_be_restricted(self):
        """绑定杂项-SKU按编码查询受限"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                f"/api/v1/skus/by-code/{self.base_data['sku_code']}",
                query={"clientCode": self.base_data["client_code"]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_06_sku_by_code_update_should_be_restricted(self):
        """绑定杂项-SKU按编码更新受限"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/skus/by-code/{self.base_data['sku_code']}",
                data={"clientCode": self.base_data["client_code"], "skuName": "Restricted Update"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_07_sku_by_code_delete_should_be_restricted(self):
        """绑定杂项-SKU按编码删除受限"""
        result = normalize_result(
            self.session.api_request(
                "DELETE",
                f"/api/v1/skus/by-code/{self.base_data['sku_code']}",
                data={"clientCode": self.base_data["client_code"]},
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_print_url_invalid_should_fail(self):
        """绑定杂项-非法打印URL生成失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-url",
                data={"documentType": "", "ids": []},
            )
        )
        self.assertFalse(result.get("success"))
