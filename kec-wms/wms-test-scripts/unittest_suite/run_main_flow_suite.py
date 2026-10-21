import os
import sys
import unittest
from datetime import datetime

from BeautifulReport import BeautifulReport

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from unittest_suite.tests.test_api_regression import TestApiRegression
from unittest_suite.tests.test_main_flow_negative import TestMainFlowNegative
from unittest_suite.tests.test_main_flow_positive import TestMainFlowPositive

METHOD_LABELS = {
    "test_01_load_base_data": "加载基础主数据",
    "test_02_prepare_inventory": "执行备货与上架准备",
    "test_03_create_order": "创建主流程出库订单",
    "test_04_order_detail": "查询订单详情",
    "test_05_allocate_or_fallback_pick": "执行分配或回退复用拣货单",
    "test_06_pick_detail": "查询拣货单详情",
    "test_07_packing_lookup": "执行打包前查询",
    "test_08_packing": "执行打包流程",
    "test_09_checkout": "执行签出流程",
    "test_10_checkout_detail": "查询签出单详情",
    "test_11_duplicate_checkout_scan_should_fail": "校验重复签出扫描失败",
    "test_12_manifest": "执行集运流程",
    "test_13_manifest_detail": "查询集运单详情",
    "test_14_manifest_validate": "校验已完成集运单再次校验失败",
}


def resolve_test_name(test) -> str:
    method_name = getattr(test, "_testMethodName", "")
    if not method_name:
        return str(test)
    return METHOD_LABELS.get(method_name, method_name)


def apply_display_names(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            apply_display_names(item)
            continue
        item._testMethodDoc = resolve_test_name(item)


def build_suite() -> unittest.TestSuite:
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    suite.addTests(loader.loadTestsFromTestCase(TestApiRegression))
    suite.addTests(loader.loadTestsFromTestCase(TestMainFlowPositive))
    suite.addTests(loader.loadTestsFromTestCase(TestMainFlowNegative))
    apply_display_names(suite)
    return suite


def main():
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    reports_dir = os.path.join(CURRENT_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    filename = f"main_flow_report_{stamp}.html"
    report = BeautifulReport(build_suite())
    report.report(
        description="主流程测试报告",
        filename=filename,
        report_dir=reports_dir,
        theme="theme_default",
    )


if __name__ == "__main__":
    main()
