from datetime import datetime, timedelta

from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestReportsRegression(FunctionalBaseCase):
    def _date_range(self):
        end = datetime.utcnow().replace(microsecond=0)
        start = end - timedelta(days=30)
        return start.isoformat() + "Z", end.isoformat() + "Z"

    def test_01_reports_overview_should_succeed(self):
        """报表模块-总览报表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/reports/overview"))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertIn("inventory", result.get("data", {}))

    def test_02_inventory_stock_levels_should_succeed(self):
        """报表模块-库存水平报表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/inventory/stock-levels",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertIn("summary", result.get("data", {}))

    def test_03_outbound_shipping_stats_should_succeed(self):
        """报表模块-出库发运统计查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/outbound/shipping-stats",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self.assertIn("summary", result.get("data", {}))

    def test_04_inventory_summary_should_succeed(self):
        """报表模块-库存汇总接口查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/summary",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_05_inventory_transactions_should_succeed(self):
        """报表模块-库存流水接口查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/inventory/transactions",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 10},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_06_inventory_aging_analysis_should_succeed(self):
        """报表模块-库存库龄分析查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/inventory/aging-analysis",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_07_inventory_expiry_alerts_should_succeed(self):
        """报表模块-库存效期预警查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/inventory/expiry-alerts",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(
            result.get("success"),
            result.get("error") or result.get("message") or "当前环境库存效期预警接口异常",
        )

    def test_08_inventory_turnover_rate_should_succeed(self):
        """报表模块-库存周转率查询成功"""
        start_date, end_date = self._date_range()
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/inventory/turnover-rate",
                query={
                    "warehouseId": self.base_data["warehouse_id"],
                    "startDate": start_date,
                    "endDate": end_date,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_09_inbound_receiving_stats_should_succeed(self):
        """报表模块-入库报表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/inbound/receiving-stats",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_10_inbound_discrepancies_should_succeed(self):
        """报表模块-入库差异报表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/inbound/discrepancies",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_11_outbound_fulfillment_rate_should_succeed(self):
        """报表模块-出库履约率报表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/outbound/fulfillment-rate",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_12_operations_efficiency_should_succeed(self):
        """报表模块-作业效率报表查询成功"""
        start_date, end_date = self._date_range()
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/operations/efficiency",
                query={
                    "warehouseId": self.base_data["warehouse_id"],
                    "startDate": start_date,
                    "endDate": end_date,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(
            result.get("success"),
            result.get("error") or result.get("message") or "当前环境作业效率报表接口异常",
        )

    def test_13_dashboard_inbound_should_succeed(self):
        """报表模块-入库看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/inbound",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_14_dashboard_inbound_timeout_should_succeed(self):
        """报表模块-入库超时看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/inbound/timeout",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_15_dashboard_inbound_timeout_details_should_succeed(self):
        """报表模块-入库超时看板明细查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/inbound/timeout/details",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_16_dashboard_outbound_should_succeed(self):
        """报表模块-出库看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/outbound",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_17_dashboard_outbound_timeout_should_succeed(self):
        """报表模块-出库超时看板查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/outbound/timeout",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_18_dashboard_outbound_timeout_details_should_succeed(self):
        """报表模块-出库超时看板明细查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/reports/dashboard/outbound/timeout/details",
                query={"warehouseId": self.base_data["warehouse_id"]},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
