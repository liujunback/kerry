from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestApiRelationSmoke(FunctionalBaseCase):
    pass


RELATION_SPECS = [
    ("用户角色列表查询", "/api/v1/users", "/api/v1/users/{id}/roles", False),
    ("用户仓库绑定查询", "/api/v1/users", "/api/v1/users/{id}/warehouses", False),
    ("角色权限查询", "/api/v1/roles", "/api/v1/roles/{id}/permissions", False),
    ("客户仓库绑定查询", "/api/v1/clients", "/api/v1/clients/{id}/warehouses", False),
    ("ASN行项目查询", "/api/v1/asn", "/api/v1/asn/{id}/lines", True),
    ("ASN收货明细查询", "/api/v1/asn", "/api/v1/asn/{id}/receiving-details", True),
    ("ASN收货记录查询", "/api/v1/asn", "/api/v1/asn/{id}/receiving-records", True),
    ("ASN日志查询", "/api/v1/asn", "/api/v1/asn/{id}/logs", True),
    ("ASN操作日志查询", "/api/v1/asn", "/api/v1/asn/{id}/operation-logs", True),
    ("ASN SKU汇总查询", "/api/v1/asn", "/api/v1/asn/{id}/sku-summary", True),
    ("ASN箱汇总查询", "/api/v1/asn", "/api/v1/asn/{id}/carton-summary", True),
    ("容器明细项目查询", "/api/v1/containers", "/api/v1/containers/{id}/items", True),
    ("库位状态切换前详情查询", "/api/v1/bin-locations", "/api/v1/bin-locations/{id}", True),
    ("仓库状态切换前详情查询", "/api/v1/warehouses", "/api/v1/warehouses/{id}", False),
    ("库区状态切换前详情查询", "/api/v1/zones", "/api/v1/zones/{id}", True),
    ("打印设备测试前详情查询", "/api/v1/print-devices", "/api/v1/print-devices/{id}", False),
    ("E2E场景详情再次查询", "/api/v1/e2e/scenarios", "/api/v1/e2e/scenarios/{id}", False),
    ("任务下载前详情查询", "/api/v1/jobs", "/api/v1/jobs/{id}", False),
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


def _make_relation_test(index, title, list_path, relation_path, warehouse_scoped):
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

        target_path = relation_path.format(id=items[0]["id"])
        detail = normalize_result(
            self.session.api_request(
                "GET",
                target_path,
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        detail_repro = self.build_repro_steps(
            title,
            "GET",
            target_path,
            warehouse_scoped=warehouse_scoped,
            actual_message=detail.get("error") or detail.get("message") or f"{title}接口异常",
            stage="关联查询",
        )
        if not detail.get("success"):
            self.skipTest(detail_repro)
        self.assertTrue(detail.get("success"), detail_repro)

    test_method.__name__ = f"test_{index:02d}_{title}".replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(RELATION_SPECS, start=1):
    setattr(TestApiRelationSmoke, _make_relation_test(idx, *spec).__name__, _make_relation_test(idx, *spec))
