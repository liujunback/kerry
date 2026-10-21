from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestPrintTemplatesManagement(FunctionalBaseCase):
    def _get_label_spec_code(self):
        specs = normalize_result(self.session.api_request("GET", "/api/v1/print-label-specs", query={"pageSize": 20}))
        self.assertTrue(specs.get("success"), specs.get("message"))
        self.assertGreater(len(specs.get("data") or []), 0)
        return specs["data"][0]["code"]

    def test_01_list_print_templates_should_succeed(self):
        """打印模板-模板列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/print-templates", query={"pageSize": 10}))
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_list_label_specs_should_succeed(self):
        """打印模板-标签规格列表查询成功"""
        code = self._get_label_spec_code()
        self.assertTrue(bool(code))

    def test_03_create_print_template_should_succeed(self):
        """打印模板-创建模板成功"""
        spec_code = self._get_label_spec_code()
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-templates",
                data={
                    "name": f"自动化模板{self.unique_tag[-6:]}",
                    "scenarioType": "SHIPMENT_LABEL",
                    "labelSpecCode": spec_code,
                    "warehouseId": self.base_data["warehouse_id"],
                    "isDefault": False,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))

    def test_04_invalid_label_spec_should_fail(self):
        """打印模板-非法标签规格创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-templates",
                data={
                    "name": f"非法模板{self.unique_tag[-6:]}",
                    "scenarioType": "SHIPMENT_LABEL",
                    "labelSpecCode": "NOT_EXIST_SPEC",
                    "warehouseId": self.base_data["warehouse_id"],
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
