from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestTypeValidationSmoke(FunctionalBaseCase):
    pass


TYPE_VALIDATION_SPECS = [
    (
        "类型校验-客户creditLimit传非法字符串失败",
        "POST",
        "/api/v1/clients",
        lambda self: {
            "clientCode": "TV-CLIENT-001",
            "clientName": "Type Validation Client",
            "creditLimit": "abc",
        },
        False,
    ),
    (
        "类型校验-仓库latitude传非法字符串失败",
        "POST",
        "/api/v1/warehouses",
        lambda self: {
            "warehouseCode": "TV-WH-001",
            "warehouseName": "Type Validation Warehouse",
            "warehouseType": "SELF_BUILT",
            "country": "CN",
            "latitude": "abc",
        },
        False,
    ),
    (
        "类型校验-容器quantity传非法字符串失败",
        "POST",
        "/api/v1/containers/batch",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "containerType": "LARGE_BOX",
            "usage": "INBOUND",
            "quantity": "abc",
        },
        True,
    ),
    (
        "类型校验-库区capacityUnits传非法对象失败",
        "POST",
        "/api/v1/zones",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "zoneCode": "TV-ZONE-001",
            "zoneName": "Type Validation Zone",
            "zoneType": "STORAGE",
            "qualityType": "GOOD",
            "capacityUnits": {},
        },
        True,
    ),
    (
        "类型校验-库位putawayPriority传非法字符串失败",
        "POST",
        "/api/v1/bin-locations",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "zoneId": self.base_data["warehouse_id"],
            "locationCode": "TV-BIN-001",
            "aisle": "A",
            "rack": "01",
            "shelf": "01",
            "bin": "01",
            "locationType": "RACK",
            "isPickable": True,
            "isReceivable": True,
            "putawayPriority": "abc",
            "pickPriority": 100,
            "pickSequence": 1,
            "maxSkuCount": 1,
        },
        True,
    ),
    (
        "类型校验-SKU clientId传非法数字失败",
        "POST",
        "/api/v1/skus",
        lambda self: {
            "clientId": 123,
            "skuCode": "TV-SKU-001",
            "skuName": "Type Validation SKU",
        },
        False,
    ),
    (
        "类型校验-用户userType传非法数字失败",
        "POST",
        "/api/v1/users",
        lambda self: {
            "username": "type_user_001",
            "fullName": "Type Validation User",
            "userType": 123,
            "password": "Admin@123",
        },
        False,
    ),
    (
        "类型校验-角色权限数组传对象失败",
        "PUT",
        "/api/v1/roles/00000000-0000-0000-0000-000000000001/permissions",
        lambda self: {
            "permissionIds": {},
        },
        False,
    ),
    (
        "类型校验-库存调整warehouseId传数字失败",
        "POST",
        "/api/v1/inventory/adjustments",
        lambda self: {
            "warehouseId": 123,
            "adjustmentType": "QUANTITY",
            "reason": "TYPE_TEST",
            "lines": [],
        },
        True,
    ),
    (
        "类型校验-库存调整lines传对象失败",
        "POST",
        "/api/v1/inventory/adjustments",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "adjustmentType": "QUANTITY",
            "reason": "TYPE_TEST",
            "lines": {},
        },
        True,
    ),
    (
        "类型校验-库存转移quantity传非法字符串失败",
        "POST",
        "/api/v1/inventory/transfers",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "lines": [
                {
                    "inventoryId": "not-a-uuid",
                    "fromLocationId": "not-a-uuid",
                    "toLocationId": "not-a-uuid",
                    "quantity": "abc",
                }
            ],
        },
        True,
    ),
    (
        "类型校验-盘点scopeType传非法数字失败",
        "POST",
        "/api/v1/inventory/counts",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "scopeType": 123,
        },
        True,
    ),
    (
        "类型校验-盘点clientIds传字符串失败",
        "POST",
        "/api/v1/inventory/counts",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "scopeType": "FULL",
            "clientIds": "not-an-array",
        },
        True,
    ),
    (
        "类型校验-分拣墙horizontalCells传非法字符串失败",
        "POST",
        "/api/v1/sorting-walls",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "wallCode": "TV-WALL-001",
            "wallName": "Type Validation Wall",
            "horizontalCells": "abc",
            "verticalCells": 2,
        },
        True,
    ),
    (
        "类型校验-打印模板labelSpecCode传数组失败",
        "POST",
        "/api/v1/print-templates",
        lambda self: {
            "name": "TV Template",
            "scenarioType": "PICK_ORDER",
            "labelSpecCode": [],
        },
        False,
    ),
    (
        "类型校验-标签规格widthMm传非法字符串失败",
        "POST",
        "/api/v1/print-label-specs",
        lambda self: {
            "specCode": "TV-SPEC-001",
            "specName": "Type Validation Spec",
            "widthMm": "abc",
            "heightMm": 100,
        },
        False,
    ),
    (
        "类型校验-退件签收logisticsNo传数字失败",
        "POST",
        "/api/v1/returns/sign-in/lookup",
        lambda self: {
            "logisticsNo": 123,
            "warehouseId": self.base_data["warehouse_id"],
        },
        False,
    ),
    (
        "类型校验-退件清点logisticsNo传数组失败",
        "POST",
        "/api/v1/returns/counting/lookup",
        lambda self: {
            "logisticsNo": [],
            "warehouseId": self.base_data["warehouse_id"],
        },
        False,
    ),
    (
        "类型校验-签出validate checkoutType传数字失败",
        "POST",
        "/api/v1/checkout/validate",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "checkoutType": 123,
        },
        False,
    ),
    (
        "类型校验-集运创建warehouseId传非法数字失败",
        "POST",
        "/api/v1/manifest-orders",
        lambda self: {
            "warehouseId": 123,
            "channelCode": "ONLINE",
            "channelName": "Online",
        },
        True,
    ),
    (
        "类型校验-PDA登录tenantCode传数组失败",
        "POST",
        "/api/v1/auth/login",
        lambda self: {
            "tenantCode": [],
            "username": "admin",
            "password": "Admin@123",
        },
        False,
    ),
    (
        "类型校验-PDA令牌登录token传数字失败",
        "POST",
        "/api/v1/auth/pda-token-login",
        lambda self: {
            "token": 123,
        },
        False,
    ),
    (
        "类型校验-包材入库quantity传非法字符串失败",
        "POST",
        "/api/v1/packaging-material-inventory/inbound",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "materialId": "not-a-uuid",
            "quantity": "abc",
        },
        True,
    ),
    (
        "类型校验-包材出库quantity传对象失败",
        "POST",
        "/api/v1/packaging-material-inventory/outbound",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "materialId": "not-a-uuid",
            "quantity": {},
        },
        True,
    ),
    (
        "类型校验-波次策略priority传非法字符串失败",
        "PUT",
        "/api/v1/wave-strategies/00000000-0000-0000-0000-000000000001",
        lambda self: {
            "priority": "abc",
        },
        False,
    ),
    (
        "类型校验-波次策略simulate orderIds传对象失败",
        "POST",
        "/api/v1/wave-strategies/00000000-0000-0000-0000-000000000001/simulate",
        lambda self: {
            "orderIds": {},
        },
        False,
    ),
    (
        "类型校验-波次策略execute orderIds传字符串失败",
        "POST",
        "/api/v1/wave-strategies/00000000-0000-0000-0000-000000000001/execute",
        lambda self: {
            "orderIds": "not-an-array",
        },
        False,
    ),
]


def _make_type_validation_test(index, title, method, path, payload_factory, warehouse_scoped):
    def test_method(self):
        """占位"""
        result = normalize_result(
            self.session.api_request(
                method,
                path,
                data=payload_factory(self),
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        self.assertFalse(result.get("success"), result.get("error") or result.get("message"))

    test_method.__name__ = f"test_{index:02d}_{title}".replace("/", "_").replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(TYPE_VALIDATION_SPECS, start=1):
    setattr(TestTypeValidationSmoke, _make_type_validation_test(idx, *spec).__name__, _make_type_validation_test(idx, *spec))
