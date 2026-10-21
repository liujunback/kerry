import os
import sys
import unittest
from datetime import datetime

from BeautifulReport import BeautifulReport

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from unittest_suite.tests.test_api_detail_smoke import TestApiDetailSmoke
from unittest_suite.tests.test_api_extended_detail_smoke import TestApiExtendedDetailSmoke
from unittest_suite.tests.test_api_extended_list_smoke import TestApiExtendedListSmoke
from unittest_suite.tests.test_api_action_negative_smoke import TestApiActionNegativeSmoke
from unittest_suite.tests.test_api_relation_smoke import TestApiRelationSmoke
from unittest_suite.tests.test_api_list_smoke import TestApiListSmoke
from unittest_suite.tests.test_api_regression import TestApiRegression
from unittest_suite.tests.test_api_validation_smoke import TestApiValidationSmoke
from unittest_suite.tests.test_admin_and_catalog_misc_smoke import TestAdminAndCatalogMiscSmoke
from unittest_suite.tests.test_asn_deep_smoke import TestAsnDeepSmoke
from unittest_suite.tests.test_auth_public_smoke import TestAuthPublicSmoke
from unittest_suite.tests.test_admin_catalog_deep_smoke import TestAdminCatalogDeepSmoke
from unittest_suite.tests.test_bin_locations_management import TestBinLocationsManagement
from unittest_suite.tests.test_binding_and_misc_smoke import TestBindingAndMiscSmoke
from unittest_suite.tests.test_boundary_date_relation_smoke import TestBoundaryDateRelationSmoke
from unittest_suite.tests.test_boundary_query_param_smoke import TestBoundaryQueryParamSmoke
from unittest_suite.tests.test_boundary_string_length_smoke import TestBoundaryStringLengthSmoke
from unittest_suite.tests.test_catalog_entity_invalid_misc_smoke import TestCatalogEntityInvalidMiscSmoke
from unittest_suite.tests.test_clients_management import TestClientsManagement
from unittest_suite.tests.test_container_misc_smoke import TestContainerMiscSmoke
from unittest_suite.tests.test_containers_management import TestContainersManagement
from unittest_suite.tests.test_dashboard_boards import TestDashboardBoards
from unittest_suite.tests.test_e2e_misc_smoke import TestE2EMiscSmoke
from unittest_suite.tests.test_external_api_restriction_smoke import TestExternalApiRestrictionSmoke
from unittest_suite.tests.test_external_api_payload_misc_smoke import TestExternalApiPayloadMiscSmoke
from unittest_suite.tests.test_file_variant_additional_misc_smoke import TestFileVariantAdditionalMiscSmoke
from unittest_suite.tests.test_file_token_and_variant_smoke import TestFileTokenAndVariantSmoke
from unittest_suite.tests.test_files_and_docs_smoke import TestFilesAndDocsSmoke
from unittest_suite.tests.test_inventory_alert_actions import TestInventoryAlertActions
from unittest_suite.tests.test_inventory_alerts import TestInventoryAlerts
from unittest_suite.tests.test_inventory_controls import TestInventoryControls
from unittest_suite.tests.test_inventory_counts import TestInventoryCounts
from unittest_suite.tests.test_inventory_transfer_flow import TestInventoryTransferFlow
from unittest_suite.tests.test_inventory_count_deep_smoke import TestInventoryCountDeepSmoke
from unittest_suite.tests.test_job_and_system_smoke import TestJobAndSystemSmoke
from unittest_suite.tests.test_scheduler_detail_crud_misc_smoke import TestSchedulerDetailCrudMiscSmoke
from unittest_suite.tests.test_main_flow_negative import TestMainFlowNegative
from unittest_suite.tests.test_main_flow_positive import TestMainFlowPositive
from unittest_suite.tests.test_manifest_orders_management import TestManifestOrdersManagement
from unittest_suite.tests.test_more_external_restrictions_smoke import TestMoreExternalRestrictionsSmoke
from unittest_suite.tests.test_outbound_extended_smoke import TestOutboundExtendedSmoke
from unittest_suite.tests.test_operations_and_files_misc_smoke import TestOperationsAndFilesMiscSmoke
from unittest_suite.tests.test_packing_shelving_deep_smoke import TestPackingShelvingDeepSmoke
from unittest_suite.tests.test_packaging_material_misc_smoke import TestPackagingMaterialMiscSmoke
from unittest_suite.tests.test_pick_assignment_misc_smoke import TestPickAssignmentMiscSmoke
from unittest_suite.tests.test_print_label_specs import TestPrintLabelSpecs
from unittest_suite.tests.test_print_templates_management import TestPrintTemplatesManagement
from unittest_suite.tests.test_reports_regression import TestReportsRegression
from unittest_suite.tests.test_resource_update_invalid_misc_smoke import TestResourceUpdateInvalidMiscSmoke
from unittest_suite.tests.test_resource_delete_invalid_misc_smoke import TestResourceDeleteInvalidMiscSmoke
from unittest_suite.tests.test_resource_invalid_crud_smoke import TestResourceInvalidCrudSmoke
from unittest_suite.tests.test_returns_operation_flow import TestReturnsOperationFlow
from unittest_suite.tests.test_returns_regression import TestReturnsRegression
from unittest_suite.tests.test_roles_management import TestRolesManagement
from unittest_suite.tests.test_skus_management import TestSkusManagement
from unittest_suite.tests.test_sorting_wall_actions import TestSortingWallActions
from unittest_suite.tests.test_sorting_walls_management import TestSortingWallsManagement
from unittest_suite.tests.test_sorting_misc_smoke import TestSortingMiscSmoke
from unittest_suite.tests.test_sorting_e2e_deep_smoke import TestSortingE2EDeepSmoke
from unittest_suite.tests.test_status_endpoint_deep_smoke import TestStatusEndpointDeepSmoke
from unittest_suite.tests.test_status_payload_edge_misc_smoke import TestStatusPayloadEdgeMiscSmoke
from unittest_suite.tests.test_supplement_pick_misc_smoke import TestSupplementPickMiscSmoke
from unittest_suite.tests.test_scheduler_device_misc_smoke import TestSchedulerDeviceMiscSmoke
from unittest_suite.tests.test_pda_misc_smoke import TestPdaMiscSmoke
from unittest_suite.tests.test_type_validation_smoke import TestTypeValidationSmoke
from unittest_suite.tests.test_users_management import TestUsersManagement
from unittest_suite.tests.test_relation_edge_cases_misc_smoke import TestRelationEdgeCasesMiscSmoke
from unittest_suite.tests.test_user_role_client_relation_misc_smoke import TestUserRoleClientRelationMiscSmoke
from unittest_suite.tests.test_user_role_binding_smoke import TestUserRoleBindingSmoke
from unittest_suite.tests.test_warehouses_management import TestWarehousesManagement
from unittest_suite.tests.test_wave_strategy_misc_smoke import TestWaveStrategyMiscSmoke
from unittest_suite.tests.test_wave_pda_external_misc_smoke import TestWavePdaExternalMiscSmoke
from unittest_suite.tests.test_waves_management import TestWavesManagement
from unittest_suite.tests.test_zones_management import TestZonesManagement
from unittest_suite.tests.test_returns_deep_smoke import TestReturnsDeepSmoke

TEST_CASES = (
    TestApiListSmoke,
    TestApiExtendedListSmoke,
    TestApiDetailSmoke,
    TestApiExtendedDetailSmoke,
    TestApiRelationSmoke,
    TestApiRegression,
    TestApiValidationSmoke,
    TestAdminAndCatalogMiscSmoke,
    TestAdminCatalogDeepSmoke,
    TestApiActionNegativeSmoke,
    TestAsnDeepSmoke,
    TestAuthPublicSmoke,
    TestBindingAndMiscSmoke,
    TestBoundaryStringLengthSmoke,
    TestBoundaryQueryParamSmoke,
    TestBoundaryDateRelationSmoke,
    TestCatalogEntityInvalidMiscSmoke,
    TestClientsManagement,
    TestWarehousesManagement,
    TestSkusManagement,
    TestContainerMiscSmoke,
    TestContainersManagement,
    TestZonesManagement,
    TestBinLocationsManagement,
    TestUsersManagement,
    TestRelationEdgeCasesMiscSmoke,
    TestUserRoleClientRelationMiscSmoke,
    TestUserRoleBindingSmoke,
    TestRolesManagement,
    TestInventoryControls,
    TestInventoryAlerts,
    TestInventoryAlertActions,
    TestInventoryCounts,
    TestInventoryCountDeepSmoke,
    TestInventoryTransferFlow,
    TestJobAndSystemSmoke,
    TestSchedulerDetailCrudMiscSmoke,
    TestSchedulerDeviceMiscSmoke,
    TestPdaMiscSmoke,
    TestOutboundExtendedSmoke,
    TestOperationsAndFilesMiscSmoke,
    TestPackingShelvingDeepSmoke,
    TestPackagingMaterialMiscSmoke,
    TestPickAssignmentMiscSmoke,
    TestE2EMiscSmoke,
    TestExternalApiRestrictionSmoke,
    TestExternalApiPayloadMiscSmoke,
    TestMoreExternalRestrictionsSmoke,
    TestFileVariantAdditionalMiscSmoke,
    TestFileTokenAndVariantSmoke,
    TestFilesAndDocsSmoke,
    TestSortingWallsManagement,
    TestSortingWallActions,
    TestSortingMiscSmoke,
    TestSortingE2EDeepSmoke,
    TestStatusEndpointDeepSmoke,
    TestStatusPayloadEdgeMiscSmoke,
    TestSupplementPickMiscSmoke,
    TestWaveStrategyMiscSmoke,
    TestWavePdaExternalMiscSmoke,
    TestTypeValidationSmoke,
    TestWavesManagement,
    TestManifestOrdersManagement,
    TestPrintTemplatesManagement,
    TestPrintLabelSpecs,
    TestResourceDeleteInvalidMiscSmoke,
    TestResourceInvalidCrudSmoke,
    TestResourceUpdateInvalidMiscSmoke,
    TestReturnsRegression,
    TestReturnsOperationFlow,
    TestReturnsDeepSmoke,
    TestReportsRegression,
    TestDashboardBoards,
    TestMainFlowPositive,
    TestMainFlowNegative,
)

TOKEN_LABELS = {
    "list": "列表",
    "detail": "详情",
    "create": "创建",
    "duplicate": "重复",
    "invalid": "非法",
    "query": "查询",
    "lookup": "查询",
    "validate": "校验",
    "complete": "完成",
    "confirm": "确认",
    "submit": "提交",
    "approve": "审批",
    "resolve": "解决",
    "release": "释放",
    "print": "打印",
    "sign": "签收",
    "putaway": "上架",
    "counting": "清点",
    "count": "盘点",
    "transfer": "转移",
    "freeze": "冻结",
    "returns": "退件",
    "return": "退件",
    "manifest": "集运",
    "checkout": "签出",
    "packing": "打包",
    "pick": "拣货",
    "order": "订单",
    "orders": "订单",
    "inventory": "库存",
    "report": "报表",
    "reports": "报表",
    "dashboard": "看板",
    "board": "看板",
    "zone": "库区",
    "zones": "库区",
    "bin": "库位",
    "location": "库位",
    "locations": "库位",
    "warehouse": "仓库",
    "warehouses": "仓库",
    "client": "客户",
    "clients": "客户",
    "sku": "SKU",
    "container": "容器",
    "user": "用户",
    "users": "用户",
    "role": "角色",
    "roles": "角色",
    "wave": "波次",
    "walls": "分拣墙",
    "wall": "分拣墙",
    "template": "模板",
    "templates": "模板",
    "label": "标签",
    "spec": "规格",
    "alerts": "预警",
    "alert": "预警",
    "smoke": "冒烟",
    "flow": "流程",
    "regression": "回归",
    "succeed": "成功",
    "fail": "失败",
}


def resolve_test_name(test) -> str:
    method_name = getattr(test, "_testMethodName", "")
    if not method_name:
        return str(test)

    core = method_name
    if core.startswith("test_"):
        parts = core.split("_")
        if len(parts) > 2 and parts[1].isdigit():
            parts = parts[2:]
        else:
            parts = parts[1:]
    else:
        parts = core.split("_")

    translated = [TOKEN_LABELS.get(part, part.upper() if part.isupper() else part) for part in parts]
    name = " ".join(str(part) for part in translated if part)
    return name or method_name


def apply_display_names(suite):
    for item in suite:
        if isinstance(item, unittest.TestSuite):
            apply_display_names(item)
            continue
        item._testMethodDoc = resolve_test_name(item)


def build_suite() -> unittest.TestSuite:
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    for case_cls in TEST_CASES:
        suite.addTests(loader.loadTestsFromTestCase(case_cls))
    apply_display_names(suite)
    return suite


def main():
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    reports_dir = os.path.join(CURRENT_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    filename = f"functional_regression_report_{stamp}.html"
    report = BeautifulReport(build_suite())
    report.report(
        description="功能回归测试报告",
        filename=filename,
        report_dir=reports_dir,
        theme="theme_default",
    )


if __name__ == "__main__":
    main()
