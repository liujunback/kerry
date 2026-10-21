from datetime import datetime, timedelta

from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


def _date_range():
    end = datetime.utcnow().replace(microsecond=0)
    start = end - timedelta(days=30)
    return start.isoformat() + "Z", end.isoformat() + "Z"


def _first_list_item(self, path, *, warehouse_scoped=False, query=None):
    query = query or {"pageSize": 1}
    if warehouse_scoped and "warehouseId" not in query:
        query["warehouseId"] = self.base_data["warehouse_id"]

    result = normalize_result(
        self.session.api_request(
            "GET",
            path,
            query=query,
            warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
        )
    )
    if not result.get("success"):
        return None, result

    payload = result.get("data")
    if isinstance(payload, list):
        return (payload[0] if payload else None), result
    if isinstance(payload, dict):
        for key in ("items", "rows", "data"):
            if isinstance(payload.get(key), list) and payload.get(key):
                return payload[key][0], result
    return None, result


def _build_asn_lookup_request(self):
    listed = normalize_result(
        self.session.api_request(
            "GET",
            "/api/v1/asn",
            query={
                "warehouseId": self.base_data["warehouse_id"],
                "status": "PENDING_RECEIVING",
                "pageSize": 20,
            },
            warehouse_id=self.base_data["warehouse_id"],
        )
    )
    if not listed.get("success"):
        return {
            "skip_reason": listed.get("error") or listed.get("message") or "ASN列表查询异常",
            "stage": "前置ASN查询",
        }

    items = (listed.get("data") or {}).get("items") if isinstance(listed.get("data"), dict) else listed.get("data")
    if not items:
        return {"skip_reason": "当前环境没有可用于ASN快速查询的数据", "stage": "前置ASN查询"}

    target = next((item for item in items if item.get("status") in ("PENDING_RECEIVING", "RECEIVING")), None) or items[0]
    receiving_mode = target.get("receiving_method") or "SKU"
    if receiving_mode == "NORMAL":
        receiving_mode = "SKU"

    return {
        "method": "GET",
        "path": "/api/v1/asn/lookup",
        "query": {
            "asnNumber": target["asnNumber"],
            "receivingMode": receiving_mode,
        },
        "warehouse_scoped": True,
        "stage": "ASN快速查询",
    }


def _build_container_lookup_request(self):
    item, listed = _first_list_item(
        self,
        "/api/v1/containers",
        warehouse_scoped=True,
        query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
    )
    if not listed.get("success"):
        return {
            "skip_reason": listed.get("error") or listed.get("message") or "容器列表查询异常",
            "stage": "前置容器查询",
        }
    if not item:
        return {"skip_reason": "当前环境没有可用于容器快速查询的数据", "stage": "前置容器查询"}
    return {
        "method": "GET",
        "path": "/api/v1/containers/lookup",
        "query": {
            "containerCode": item["containerCode"],
            "warehouseId": self.base_data["warehouse_id"],
        },
        "warehouse_scoped": True,
        "stage": "容器快速查询",
    }


def _build_pick_list_request(self):
    item, listed = _first_list_item(
        self,
        "/api/v1/pick-orders",
        warehouse_scoped=True,
        query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
    )
    if not listed.get("success"):
        return {
            "skip_reason": listed.get("error") or listed.get("message") or "拣货单列表查询异常",
            "stage": "前置拣货单查询",
        }
    if not item:
        return {"skip_reason": "当前环境没有可用于拣货清单打印的数据", "stage": "前置拣货单查询"}
    return {
        "method": "POST",
        "path": "/api/v1/pick-orders/pick-list",
        "data": {"taskIds": [item["id"]]},
        "warehouse_scoped": True,
        "stage": "拣货清单打印数据查询",
    }


def _build_wave_pick_list_request(self):
    item, listed = _first_list_item(
        self,
        "/api/v1/waves",
        warehouse_scoped=True,
        query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
    )
    if not listed.get("success"):
        return {
            "skip_reason": listed.get("error") or listed.get("message") or "波次列表查询异常",
            "stage": "前置波次查询",
        }
    if not item:
        return {"skip_reason": "当前环境没有可用于波次拣货清单打印的数据", "stage": "前置波次查询"}
    return {
        "method": "POST",
        "path": "/api/v1/waves/pick-list",
        "data": {"waveIds": [item["id"]]},
        "warehouse_scoped": True,
        "stage": "波次拣货清单打印数据查询",
    }


class TestApiExtendedListSmoke(FunctionalBaseCase):
    pass


LIST_SPECS = [
    {"title": "API Keys列表查询", "method": "GET", "path": "/api/v1/api-keys", "query": lambda self: {"pageSize": 10}, "warehouse_scoped": False},
    {"title": "权限列表查询", "method": "GET", "path": "/api/v1/permissions", "query": lambda self: {"pageSize": 50}, "warehouse_scoped": False},
    {"title": "打印设备列表查询", "method": "GET", "path": "/api/v1/print-devices", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "包装材料列表查询", "method": "GET", "path": "/api/v1/packaging-materials", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "包装材料库存列表查询", "method": "GET", "path": "/api/v1/packaging-material-inventory", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "包装材料预警查询", "method": "GET", "path": "/api/v1/packaging-material-inventory/alerts", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "包装材料流水列表查询", "method": "GET", "path": "/api/v1/packaging-material-transactions", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "拣货单列表查询", "method": "GET", "path": "/api/v1/pick-orders", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "拣货清单查询", "request_builder": _build_pick_list_request},
    {"title": "可生成拣货单订单查询", "method": "GET", "path": "/api/v1/pick-orders/available-orders", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "拣货分配规则列表查询", "method": "GET", "path": "/api/v1/pick-assignment-rules", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "拣货员画像列表查询", "method": "GET", "path": "/api/v1/picker-profiles", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "组合商品列表查询", "method": "GET", "path": "/api/v1/combo-products", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "SKU分类列表查询", "method": "GET", "path": "/api/v1/sku-categories", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "波次策略列表查询", "method": "GET", "path": "/api/v1/wave-strategies", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "波次策略筛选项查询", "method": "GET", "path": "/api/v1/wave-strategies/filter-options", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"]}, "warehouse_scoped": True},
    {"title": "波次策略运行记录查询", "method": "GET", "path": "/api/v1/wave-strategy-runs", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "定时任务列表查询", "method": "GET", "path": "/api/v1/scheduled-tasks", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "任务中心列表查询", "method": "GET", "path": "/api/v1/jobs", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "操作日志列表查询", "method": "GET", "path": "/api/v1/operation-logs", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "审计日志列表查询", "method": "GET", "path": "/api/v1/audits", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "语言配置查询", "method": "GET", "path": "/api/v1/locale", "query": lambda self: {}, "warehouse_scoped": False},
    {"title": "当前登录信息查询", "method": "GET", "path": "/api/v1/auth/me", "query": lambda self: {}, "warehouse_scoped": False},
    {"title": "PDA版本查询", "method": "GET", "path": "/api/v1/pda/app-version", "query": lambda self: {}, "warehouse_scoped": False},
    {"title": "首页统计查询", "method": "GET", "path": "/api/v1/dashboard/stats", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"]}, "warehouse_scoped": True},
    {"title": "上架单列表查询", "method": "GET", "path": "/api/v1/putaway/orders/list", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "上架单快捷列表查询", "method": "GET", "path": "/api/v1/putaway/orders/list", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "待上架行查询", "method": "GET", "path": "/api/v1/putaway/pending-lines", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "待上架容器查询", "method": "GET", "path": "/api/v1/putaway/pending-containers", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "ASN列表扩展查询", "method": "GET", "path": "/api/v1/asn", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "ASN快速查询", "request_builder": _build_asn_lookup_request},
    {"title": "序列号列表查询", "method": "GET", "path": "/api/v1/serial-numbers", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "租户列表查询", "method": "GET", "path": "/api/v1/tenants", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "E2E分类列表查询", "method": "GET", "path": "/api/v1/e2e/categories", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "E2E场景列表查询", "method": "GET", "path": "/api/v1/e2e/scenarios", "query": lambda self: {"pageSize": 20}, "warehouse_scoped": False},
    {"title": "容器查找接口查询", "request_builder": _build_container_lookup_request},
    {"title": "库位作用域选项查询", "method": "GET", "path": "/api/v1/bin-locations/scope-options", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"]}, "warehouse_scoped": True},
    {"title": "打包待签出列表查询", "method": "GET", "path": "/api/v1/checkout/pending", "query": lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 20}, "warehouse_scoped": True},
    {"title": "波次拣货总清单查询", "request_builder": _build_wave_pick_list_request},
]


def _make_list_test(index, spec):
    title = spec["title"]

    def test_method(self):
        """占位"""
        if "request_builder" in spec:
            request_meta = spec["request_builder"](self)
            if request_meta.get("skip_reason"):
                self.skipTest(
                    self.build_repro_steps(
                        title,
                        request_meta.get("method", "GET"),
                        request_meta.get("path", ""),
                        query=request_meta.get("query"),
                        data=request_meta.get("data"),
                        warehouse_scoped=request_meta.get("warehouse_scoped", False),
                        actual_message=request_meta["skip_reason"],
                        stage=request_meta.get("stage", "接口调用"),
                    )
                )
        else:
            request_meta = {
                "method": spec["method"],
                "path": spec["path"],
                "query": spec["query"](self),
                "warehouse_scoped": spec["warehouse_scoped"],
                "stage": "接口调用",
            }

        result = normalize_result(
            self.session.api_request(
                request_meta["method"],
                request_meta["path"],
                query=request_meta.get("query"),
                data=request_meta.get("data"),
                warehouse_id=self.base_data["warehouse_id"] if request_meta.get("warehouse_scoped") else None,
            )
        )
        repro = self.build_repro_steps(
            title,
            request_meta["method"],
            request_meta["path"],
            query=request_meta.get("query"),
            data=request_meta.get("data"),
            warehouse_scoped=request_meta.get("warehouse_scoped", False),
            actual_message=result.get("error") or result.get("message") or f"{title}接口异常",
            stage=request_meta.get("stage", "接口调用"),
        )
        self.assertTrue(result.get("success"), repro)

    test_method.__name__ = f"test_{index:02d}_{title}".replace("/", "_").replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(LIST_SPECS, start=1):
    setattr(TestApiExtendedListSmoke, _make_list_test(idx, spec).__name__, _make_list_test(idx, spec))
