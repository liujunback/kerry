from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


INVALID_UUID = "00000000-0000-0000-0000-000000000001"


class TestE2EMiscSmoke(FunctionalBaseCase):
    def test_01_e2e_categories_should_succeed(self):
        """E2E模块-分类列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/e2e/categories", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_02_e2e_scenarios_should_succeed(self):
        """E2E模块-场景列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/e2e/scenarios", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_03_e2e_scenario_create_invalid_should_fail(self):
        """E2E模块-非法场景创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/e2e/scenarios",
                data={"categoryCode": "", "code": "", "name": "", "config": {}, "expected": {}},
            )
        )
        self.assertFalse(result.get("success"))

    def test_04_e2e_scenario_detail_invalid_should_fail(self):
        """E2E模块-非法场景详情失败"""
        result = normalize_result(self.session.api_request("GET", f"/api/v1/e2e/scenarios/{INVALID_UUID}"))
        self.assertFalse(result.get("success"))

    def test_05_e2e_scenario_execute_invalid_should_fail(self):
        """E2E模块-非法单场景执行失败"""
        result = normalize_result(self.session.api_request("POST", f"/api/v1/e2e/scenarios/{INVALID_UUID}/execute", data={}))
        self.assertFalse(result.get("success"))

    def test_06_e2e_scenario_execute_batch_invalid_should_fail(self):
        """E2E模块-非法批量执行失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/e2e/scenarios/execute-batch", data={}))
        self.assertFalse(result.get("success"))

    def test_07_e2e_scenario_match_invalid_should_fail(self):
        """E2E模块-非法场景匹配失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/e2e/scenarios/match", data={}))
        self.assertFalse(result.get("success"))

    def test_08_e2e_scenario_match_valid_should_succeed(self):
        """E2E模块-场景匹配成功"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/e2e/scenarios/match",
                data={"businessType": "asn", "skuCode": "SKU001", "expectedQty": 10},
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))

    def test_09_e2e_scenario_export_should_succeed(self):
        """E2E模块-场景导出成功"""
        result = self.session.api_request("GET", "/api/v1/e2e/scenarios/export")
        self.assertEqual(result["status"], 200)

    def test_10_e2e_scenario_import_without_file_should_fail(self):
        """E2E模块-无文件导入失败"""
        result = normalize_result(self.session.api_request("POST", "/api/v1/e2e/scenarios/import", data={}))
        self.assertFalse(result.get("success"))
