from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestClientsManagement(FunctionalBaseCase):
    def test_01_list_clients_should_succeed(self):
        """客户管理-客户列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/clients", query={"pageSize": 10}))
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_search_existing_client_should_succeed(self):
        """客户管理-按客户编码查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/clients",
                query={"search": self.base_data["client_code"], "pageSize": 10},
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertGreater(len(result.get("data") or []), 0)

    def test_03_create_client_should_succeed(self):
        """客户管理-创建客户成功"""
        client_code = f"CL-{self.unique_tag[-8:]}"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/clients",
                data={
                    "clientCode": client_code,
                    "clientName": f"自动化客户{self.unique_tag[-6:]}",
                    "shortName": f"自动化{self.unique_tag[-4:]}",
                    "clientType": "STANDARD",
                    "contactPerson": "Auto Tester",
                    "contactPhone": "13800000000",
                    "contactEmail": f"auto{self.unique_tag[-6:]}@example.com",
                    "city": "Shanghai",
                    "country": "CN",
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertEqual(result["data"]["clientCode"], client_code)

    def test_04_create_duplicate_client_should_fail(self):
        """客户管理-重复客户编码创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/clients",
                data={
                    "clientCode": self.base_data["client_code"],
                    "clientName": "重复客户",
                    "clientType": "STANDARD",
                },
            )
        )
        self.assertFalse(result.get("success"))
