from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestPackagingMaterialMiscSmoke(FunctionalBaseCase):
    def test_01_packaging_material_detail_invalid_should_fail(self):
        """包材扩展-非法包材详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/packaging-materials/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_02_packaging_material_update_invalid_should_fail(self):
        """包材扩展-非法包材更新失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/packaging-materials/{INVALID_UUID}",
                data={"materialName": "invalid-update"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_03_packaging_material_delete_invalid_should_fail(self):
        """包材扩展-非法包材删除失败"""
        result = normalize_result(self.session.api_request("DELETE", f"/api/v1/packaging-materials/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_04_packaging_material_status_invalid_should_fail(self):
        """包材扩展-非法包材状态修改失败"""
        result = normalize_result(
            self.session.api_request(
                "PUT",
                f"/api/v1/packaging-materials/{INVALID_UUID}/status",
                data={"isActive": False},
            )
        )
        self.assertFalse(result.get("success"))

    def test_05_packaging_material_inventory_detail_invalid_should_fail(self):
        """包材扩展-非法包材库存详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/packaging-material-inventory/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_06_packaging_material_transaction_detail_invalid_should_fail(self):
        """包材扩展-非法包材流水详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/packaging-material-transactions/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_07_packaging_material_transaction_audit_invalid_should_fail(self):
        """包材扩展-非法包材流水审核失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/packaging-material-transactions/{INVALID_UUID}/audit",
                data={"auditStatus": "APPROVED"},
            )
        )
        self.assertFalse(result.get("success"))

    def test_08_packaging_material_inventory_inbound_invalid_should_fail(self):
        """包材扩展-非法包材入库失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/packaging-material-inventory/inbound",
                data={"warehouseId": "", "materialId": "", "quantity": 0},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))

    def test_09_packaging_material_inventory_outbound_invalid_should_fail(self):
        """包材扩展-非法包材出库失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/packaging-material-inventory/outbound",
                data={"warehouseId": "", "materialId": "", "quantity": 0},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
