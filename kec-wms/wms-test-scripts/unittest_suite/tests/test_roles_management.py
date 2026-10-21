from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestRolesManagement(FunctionalBaseCase):
    def test_01_list_roles_should_succeed(self):
        """角色管理-角色列表查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/roles", query={"pageSize": 10}))
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_list_all_roles_should_succeed(self):
        """角色管理-全量角色查询成功"""
        result = normalize_result(self.session.api_request("GET", "/api/v1/roles", query={"all": "true"}))
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_03_create_role_should_succeed(self):
        """角色管理-创建角色成功"""
        role_code = f"AUTO_ROLE_{self.unique_tag[-6:]}"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/roles",
                data={
                    "roleCode": role_code,
                    "roleName": f"自动化角色{self.unique_tag[-4:]}",
                    "description": "功能回归自动创建",
                    "roleLevel": 3,
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertEqual(result["data"]["roleCode"], role_code)

    def test_04_create_duplicate_role_should_fail(self):
        """角色管理-重复角色编码创建失败"""
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/roles",
                data={
                    "roleCode": "SYSTEM_ADMIN",
                    "roleName": "重复角色",
                    "description": "重复校验",
                    "roleLevel": 1,
                },
            )
        )
        self.assertFalse(result.get("success"))
