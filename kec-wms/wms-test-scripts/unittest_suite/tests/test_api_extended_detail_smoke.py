from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestApiExtendedDetailSmoke(FunctionalBaseCase):
    pass


DETAIL_SPECS = [
    ("用户详情扩展查询", "/api/v1/users", "/api/v1/users/{id}", False),
    ("API Key详情查询", "/api/v1/api-keys", "/api/v1/api-keys/{id}", False),
    ("打印设备详情查询", "/api/v1/print-devices", "/api/v1/print-devices/{id}", False),
    ("包装材料详情查询", "/api/v1/packaging-materials", "/api/v1/packaging-materials/{id}", False),
    ("包装材料库存详情查询", "/api/v1/packaging-material-inventory", "/api/v1/packaging-material-inventory/{id}", True),
    ("包装材料流水详情查询", "/api/v1/packaging-material-transactions", "/api/v1/packaging-material-transactions/{id}", True),
    ("拣货单详情扩展查询", "/api/v1/pick-orders", "/api/v1/pick-orders/{id}", True),
    ("拣货分配规则详情查询", "/api/v1/pick-assignment-rules", "/api/v1/pick-assignment-rules/{id}", True),
    ("拣货员画像详情查询", "/api/v1/picker-profiles", "/api/v1/picker-profiles/{id}", True),
    ("组合商品详情查询", "/api/v1/combo-products", "/api/v1/combo-products/{id}", False),
    ("SKU分类详情查询", "/api/v1/sku-categories", "/api/v1/sku-categories/{id}", False),
    ("波次策略详情查询", "/api/v1/wave-strategies", "/api/v1/wave-strategies/{id}", True),
    ("波次策略运行详情查询", "/api/v1/wave-strategy-runs", "/api/v1/wave-strategy-runs/{id}", True),
    ("定时任务详情查询", "/api/v1/scheduled-tasks", "/api/v1/scheduled-tasks/{id}", False),
    ("任务中心详情查询", "/api/v1/jobs", "/api/v1/jobs/{id}", False),
    ("上架单详情查询", "/api/v1/putaway/orders/list", "/api/v1/putaway/orders/{id}", True),
    ("ASN详情扩展查询", "/api/v1/asn", "/api/v1/asn/{id}", True),
    ("租户详情查询", "/api/v1/tenants", "/api/v1/tenants/{id}", False),
    ("E2E场景详情查询", "/api/v1/e2e/scenarios", "/api/v1/e2e/scenarios/{id}", False),
    ("签出单详情扩展查询", "/api/v1/checkout", "/api/v1/checkout/{id}", True),
]


def _extract_items(result):
    payload = result.get("data")
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("items", "rows", "data"):
            if isinstance(payload.get(key), list):
                return payload.get(key) or []
    return []


def _make_detail_test(index, title, list_path, detail_path, warehouse_scoped):
    def test_method(self):
        """占位"""
        query = {"pageSize": 1}
        if warehouse_scoped:
            query["warehouseId"] = self.base_data["warehouse_id"]

        listed = normalize_result(
            self.session.api_request(
                "GET",
                list_path,
                query=query,
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        list_repro = self.build_repro_steps(
            title,
            "GET",
            list_path,
            query=query,
            warehouse_scoped=warehouse_scoped,
            actual_message=listed.get("error") or listed.get("message") or f"{title}列表异常",
            stage="前置列表查询",
        )
        if not listed.get("success"):
            self.skipTest(list_repro)

        items = _extract_items(listed)
        if not items:
            self.skipTest(
                self.build_repro_steps(
                    title,
                    "GET",
                    list_path,
                    query=query,
                    warehouse_scoped=warehouse_scoped,
                    actual_message=f"{title}当前环境无数据",
                    stage="前置列表查询",
                )
            )

        detail_path_value = detail_path.format(id=items[0]["id"])
        detail = normalize_result(
            self.session.api_request(
                "GET",
                detail_path_value,
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        detail_repro = self.build_repro_steps(
            title,
            "GET",
            detail_path_value,
            warehouse_scoped=warehouse_scoped,
            actual_message=detail.get("error") or detail.get("message") or f"{title}详情异常",
            stage="详情查询",
        )
        self.assertTrue(detail.get("success"), detail_repro)

    test_method.__name__ = f"test_{index:02d}_{title}".replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(DETAIL_SPECS, start=1):
    setattr(TestApiExtendedDetailSmoke, _make_detail_test(idx, *spec).__name__, _make_detail_test(idx, *spec))
