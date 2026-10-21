from datetime import datetime, timedelta

from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


def _date_range():
    end = datetime.utcnow().replace(microsecond=0)
    start = end - timedelta(days=30)
    return start.isoformat() + "Z", end.isoformat() + "Z"


class TestApiListSmoke(FunctionalBaseCase):
    pass


LIST_SPECS = [
    ("客户列表查询", "/api/v1/clients", lambda self: {"pageSize": 10}, False),
    ("仓库列表查询", "/api/v1/warehouses", lambda self: {"pageSize": 10}, False),
    ("SKU列表查询", "/api/v1/skus", lambda self: {"clientId": self.base_data["client_id"], "pageSize": 10}, True),
    ("容器列表查询", "/api/v1/containers", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("用户列表查询", "/api/v1/users", lambda self: {"pageSize": 10}, False),
    ("角色列表查询", "/api/v1/roles", lambda self: {"pageSize": 10}, False),
    ("调整单列表查询", "/api/v1/inventory/adjustments", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("转移单列表查询", "/api/v1/inventory/transfers", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("冻结列表查询", "/api/v1/inventory/freezes", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("预警列表查询", "/api/v1/inventory/alerts", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("盘点单列表查询", "/api/v1/inventory/counts", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("打印模板列表查询", "/api/v1/print-templates", lambda self: {"pageSize": 10}, False),
    ("标签规格列表查询", "/api/v1/print-label-specs", lambda self: {"pageSize": 10}, False),
    ("打印历史列表查询", "/api/v1/print-history", lambda self: {"pageSize": 10}, False),
    ("分拣墙列表查询", "/api/v1/sorting-walls", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("退件列表查询", "/api/v1/returns", lambda self: {"pageSize": 10}, False),
    ("退件上架候选查询", "/api/v1/returns/putaway/candidates", lambda self: {}, False),
    ("报表总览查询", "/api/v1/reports/overview", lambda self: {}, False),
    ("库存水平报表查询", "/api/v1/reports/inventory/stock-levels", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("库存汇总接口查询", "/api/v1/inventory/summary", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("库存流水接口查询", "/api/v1/inventory/transactions", lambda self: {"warehouseId": self.base_data["warehouse_id"], "pageSize": 10}, True),
    ("库存库龄分析查询", "/api/v1/reports/inventory/aging-analysis", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("库存效期预警查询", "/api/v1/reports/inventory/expiry-alerts", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("入库报表查询", "/api/v1/reports/inbound/receiving-stats", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("入库差异报表查询", "/api/v1/reports/inbound/discrepancies", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("出库发运统计查询", "/api/v1/reports/outbound/shipping-stats", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("出库履约率报表查询", "/api/v1/reports/outbound/fulfillment-rate", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("作业效率报表查询", lambda self: "/api/v1/reports/operations/efficiency", None, True),
    ("库存周转率查询", lambda self: "/api/v1/reports/inventory/turnover-rate", None, True),
    ("入库看板查询", "/api/v1/reports/dashboard/inbound", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("入库超时看板查询", "/api/v1/reports/dashboard/inbound/timeout", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("入库超时看板明细查询", "/api/v1/reports/dashboard/inbound/timeout/details", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("出库看板查询", "/api/v1/reports/dashboard/outbound", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("出库超时看板查询", "/api/v1/reports/dashboard/outbound/timeout", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
    ("出库超时看板明细查询", "/api/v1/reports/dashboard/outbound/timeout/details", lambda self: {"warehouseId": self.base_data["warehouse_id"]}, True),
]


def _make_list_test(index, title, path_or_factory, query_factory, warehouse_scoped):
    def test_method(self):
        """占位"""
        if callable(path_or_factory):
            path = path_or_factory(self)
            start_date, end_date = _date_range()
            query = {"warehouseId": self.base_data["warehouse_id"], "startDate": start_date, "endDate": end_date}
        else:
            path = path_or_factory
            query = query_factory(self)

        result = normalize_result(
            self.session.api_request(
                "GET",
                path,
                query=query,
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )

        repro = self.build_repro_steps(
            title,
            "GET",
            path,
            query=query,
            warehouse_scoped=warehouse_scoped,
            actual_message=result.get("error") or result.get("message") or f"{title}接口异常",
        )
        self.assertTrue(result.get("success"), repro)

    test_method.__name__ = f"test_{index:02d}_{path_or_factory if isinstance(path_or_factory, str) else title}".replace("/", "_").replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(LIST_SPECS, start=1):
    setattr(TestApiListSmoke, _make_list_test(idx, *spec).__name__, _make_list_test(idx, *spec))
