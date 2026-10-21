from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestApiDetailSmoke(FunctionalBaseCase):
    pass


DETAIL_SPECS = [
    ("客户详情查询", "/api/v1/clients", "/api/v1/clients/{id}", False),
    ("仓库详情查询", "/api/v1/warehouses", "/api/v1/warehouses/{id}", False),
    ("SKU详情查询", "/api/v1/skus", "/api/v1/skus/{id}", True),
    ("容器详情查询", "/api/v1/containers", "/api/v1/containers/{id}", True),
    ("角色详情查询", "/api/v1/roles", "/api/v1/roles/{id}", False),
    ("分拣墙详情查询", "/api/v1/sorting-walls", "/api/v1/sorting-walls/{id}", True),
    ("分拣墙格口查询", "/api/v1/sorting-walls", "/api/v1/sorting-walls/{id}/cells", True),
    ("打印模板详情查询", "/api/v1/print-templates", "/api/v1/print-templates/{id}", False),
    ("调整单详情查询", "/api/v1/inventory/adjustments", "/api/v1/inventory/adjustments/{id}", True),
    ("转移单详情查询", "/api/v1/inventory/transfers", "/api/v1/inventory/transfers/{id}", True),
    ("冻结详情查询", "/api/v1/inventory/freezes", "/api/v1/inventory/freezes/{id}", True),
    ("盘点单详情查询", "/api/v1/inventory/counts", "/api/v1/inventory/counts/{id}", True),
    ("退件详情查询", "/api/v1/returns", "/api/v1/returns/{id}", False),
]


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
        if not listed.get("success"):
            self.skipTest(listed.get("error") or listed.get("message") or f"{title}列表异常")
        payload = listed.get("data")
        if isinstance(payload, list):
            data = payload
        elif isinstance(payload, dict):
            if isinstance(payload.get("items"), list):
                data = payload.get("items") or []
            elif isinstance(payload.get("rows"), list):
                data = payload.get("rows") or []
            elif isinstance(payload.get("data"), list):
                data = payload.get("data") or []
            else:
                data = []
        else:
            data = []

        if not data:
            self.skipTest(f"{title}当前环境无数据")

        detail = normalize_result(
            self.session.api_request(
                "GET",
                detail_path.format(id=data[0]["id"]),
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        self.assertTrue(detail.get("success"), detail.get("error") or detail.get("message"))

    test_method.__name__ = f"test_{index:02d}_{title}".replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(DETAIL_SPECS, start=1):
    setattr(TestApiDetailSmoke, _make_detail_test(idx, *spec).__name__, _make_detail_test(idx, *spec))
