from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestApiActionNegativeSmoke(FunctionalBaseCase):
    pass


ACTION_SPECS = [
    ("无效库存预警确认失败", "POST", f"/api/v1/inventory/alerts/{INVALID_UUID}/acknowledge", lambda self: {}, True),
    ("无效库存预警解决失败", "POST", f"/api/v1/inventory/alerts/{INVALID_UUID}/resolve", lambda self: {}, True),
    ("无效转移单提交失败", "POST", f"/api/v1/inventory/transfers/{INVALID_UUID}/submit", lambda self: {}, True),
    ("无效转移单审批失败", "POST", f"/api/v1/inventory/transfers/{INVALID_UUID}/approve", lambda self: {}, True),
    ("无效转移单拒绝失败", "POST", f"/api/v1/inventory/transfers/{INVALID_UUID}/reject", lambda self: {}, True),
    ("无效转移单执行失败", "POST", f"/api/v1/inventory/transfers/{INVALID_UUID}/execute", lambda self: {}, True),
    ("无效调整单提交失败", "POST", f"/api/v1/inventory/adjustments/{INVALID_UUID}/submit", lambda self: {}, True),
    ("无效调整单审批失败", "POST", f"/api/v1/inventory/adjustments/{INVALID_UUID}/approve", lambda self: {}, True),
    ("无效调整单拒绝失败", "POST", f"/api/v1/inventory/adjustments/{INVALID_UUID}/reject", lambda self: {}, True),
    ("无效调整单执行失败", "POST", f"/api/v1/inventory/adjustments/{INVALID_UUID}/execute", lambda self: {}, True),
    ("无效冻结释放失败", "POST", f"/api/v1/inventory/freezes/{INVALID_UUID}/release", lambda self: {}, True),
    ("无效盘点单生成失败", "POST", f"/api/v1/inventory/counts/{INVALID_UUID}/generate", lambda self: {}, True),
    ("无效盘点单取消失败", "POST", f"/api/v1/inventory/counts/{INVALID_UUID}/cancel", lambda self: {}, True),
    ("无效盘点单结算失败", "POST", f"/api/v1/inventory/counts/{INVALID_UUID}/settle", lambda self: {}, True),
    ("无效波次释放失败", "POST", f"/api/v1/waves/{INVALID_UUID}/release", lambda self: {}, True),
    ("无效拣货单打印失败", "POST", f"/api/v1/pick-orders/{INVALID_UUID}/print", lambda self: {}, True),
    ("无效拣货单分配失败", "POST", f"/api/v1/pick-orders/{INVALID_UUID}/assign", lambda self: {"pickerId": INVALID_UUID}, True),
    ("无效集运单完成失败", "POST", f"/api/v1/manifest-orders/{INVALID_UUID}/complete", lambda self: {}, True),
    ("无效集运单打印失败", "POST", f"/api/v1/manifest-orders/{INVALID_UUID}/print", lambda self: {}, True),
    ("无效上架单打印失败", "POST", f"/api/v1/putaway/orders/{INVALID_UUID}/print", lambda self: {}, True),
    ("无效容器重置失败", "POST", f"/api/v1/containers/{INVALID_UUID}/reset", lambda self: {}, True),
    ("无效容器关闭失败", "POST", f"/api/v1/containers/{INVALID_UUID}/close", lambda self: {}, True),
    ("无效容器改包失败", "POST", f"/api/v1/containers/{INVALID_UUID}/repack", lambda self: {}, True),
    ("无效分拣墙释放失败", "POST", f"/api/v1/sorting-walls/{INVALID_UUID}/release", lambda self: {}, True),
    ("无效分拣墙状态切换失败", "PUT", f"/api/v1/sorting-walls/{INVALID_UUID}/status", lambda self: {"status": "ACTIVE"}, True),
    ("无效库位状态切换失败", "PUT", f"/api/v1/bin-locations/{INVALID_UUID}/status", lambda self: {"status": "ACTIVE"}, True),
    ("无效库位锁定失败", "PUT", f"/api/v1/bin-locations/{INVALID_UUID}/lock", lambda self: {"lockStatus": "LOCKED"}, True),
    ("无效仓库状态切换失败", "PUT", f"/api/v1/warehouses/{INVALID_UUID}/status", lambda self: {"status": "ACTIVE"}, False),
    ("无效库区状态切换失败", "PUT", f"/api/v1/zones/{INVALID_UUID}/status", lambda self: {"status": "ACTIVE"}, True),
    ("无效SKU状态切换失败", "PUT", f"/api/v1/skus/{INVALID_UUID}/status", lambda self: {"status": "ACTIVE"}, False),
    ("无效用户状态切换失败", "PUT", f"/api/v1/users/{INVALID_UUID}/status", lambda self: {"status": "ACTIVE"}, False),
    ("无效用户改密失败", "POST", f"/api/v1/users/{INVALID_UUID}/password", lambda self: {"newPassword": "Admin@123"}, False),
    ("无效用户默认仓库设置失败", "POST", f"/api/v1/users/{INVALID_UUID}/warehouses/default", lambda self: {"warehouseId": INVALID_UUID}, False),
    ("无效用户角色分配失败", "POST", f"/api/v1/users/{INVALID_UUID}/roles", lambda self: {"roleId": INVALID_UUID}, False),
    ("无效用户仓库绑定失败", "POST", f"/api/v1/users/{INVALID_UUID}/warehouses", lambda self: {"warehouseId": INVALID_UUID}, False),
    ("无效角色权限分配失败", "POST", f"/api/v1/roles/{INVALID_UUID}/permissions", lambda self: {"permissionId": INVALID_UUID}, False),
    ("无效退件签收入参失败", "POST", "/api/v1/returns/sign-in/confirm", lambda self: {"returnNo": "", "warehouseId": ""}, False),
    ("无效退件上架执行失败", "POST", "/api/v1/returns/putaway/execute", lambda self: {"orderId": INVALID_UUID, "warehouseId": self.base_data["warehouse_id"]}, True),
    ("无效退件清点完成失败", "POST", f"/api/v1/returns/{INVALID_UUID}/complete-counting", lambda self: {}, False),
    ("无效退件清点行失败", "POST", f"/api/v1/returns/{INVALID_UUID}/count-lines", lambda self: {"lines": []}, False),
    ("无效签出校验失败", "POST", "/api/v1/checkout/validate", lambda self: {"warehouseId": "", "checkoutType": ""}, False),
    ("无效签出扫描失败", "POST", "/api/v1/checkout/scan", lambda self: {"checkoutOrderId": INVALID_UUID, "scannedNumber": "", "checkoutType": "BAG"}, False),
    ("无效签出确认失败", "POST", "/api/v1/checkout/confirm", lambda self: {"checkoutOrderId": INVALID_UUID}, False),
    ("无效集运挂载校验失败", "POST", "/api/v1/manifest-mount/validate", lambda self: {"manifestNumber": ""}, False),
    ("无效集运挂载扫描失败", "POST", "/api/v1/manifest-mount/scan", lambda self: {"manifestOrderId": INVALID_UUID, "checkoutNumber": ""}, True),
    ("无效集运挂载确认失败", "POST", "/api/v1/manifest-mount/confirm", lambda self: {"manifestOrderId": INVALID_UUID}, True),
    ("无效波次策略模拟失败", "POST", f"/api/v1/wave-strategies/{INVALID_UUID}/simulate", lambda self: {}, True),
    ("无效波次策略发布失败", "POST", f"/api/v1/wave-strategies/{INVALID_UUID}/publish", lambda self: {}, True),
    ("无效波次策略执行失败", "POST", f"/api/v1/wave-strategies/{INVALID_UUID}/execute", lambda self: {}, True),
    ("无效波次策略回滚失败", "POST", f"/api/v1/wave-strategies/{INVALID_UUID}/rollback", lambda self: {}, True),
    ("无效波次策略复制失败", "POST", f"/api/v1/wave-strategies/{INVALID_UUID}/copy", lambda self: {}, True),
]


def _make_action_test(index, title, method, path, data_factory, warehouse_scoped):
    def test_method(self):
        """占位"""
        result = normalize_result(
            self.session.api_request(
                method,
                path,
                data=data_factory(self),
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        self.assertFalse(result.get("success"))

    test_method.__name__ = f"test_{index:02d}_{title}".replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(ACTION_SPECS, start=1):
    setattr(TestApiActionNegativeSmoke, _make_action_test(idx, *spec).__name__, _make_action_test(idx, *spec))
