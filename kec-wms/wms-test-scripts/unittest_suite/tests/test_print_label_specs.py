from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestPrintLabelSpecs(FunctionalBaseCase):
    def test_01_list_label_specs_should_succeed(self):
        """标签规格-列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/print-label-specs", query={"pageSize": 20}))
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_create_label_spec_should_succeed(self):
        """标签规格-创建成功"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-label-specs",
                data={
                    "name": f"自动化规格{self.unique_tag[-6:]}",
                    "widthMm": 100,
                    "heightMm": 150,
                    "orientation": "portrait",
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))

    def test_03_invalid_label_spec_should_fail(self):
        """标签规格-非法规格创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/print-label-specs",
                data={"name": "", "widthMm": 1, "heightMm": 1},
            )
        )
        self.assertFalse(result.get("success"))
