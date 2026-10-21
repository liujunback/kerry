from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestZonesManagement(FunctionalBaseCase):
    def test_01_list_zones_should_succeed(self):
        """库区管理-库区列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/zones",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_zone_detail_should_succeed(self):
        """库区管理-库区详情查询成功"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/zones",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        self.assertGreater(len(listed.get("data") or []), 0)
        zone_id = listed["data"][0]["id"]
        detail = normalize_result(
            self.session.api_request("GET", f"/api/v1/zones/{zone_id}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(detail.get("success"), detail.get("message"))

    def test_03_create_zone_should_succeed(self):
        """库区管理-创建库区成功"""
        zone_code = f"ZONE-{self.unique_tag[-6:]}"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/zones",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "zoneCode": zone_code,
                    "zoneName": f"自动化库区{self.unique_tag[-4:]}",
                    "zoneType": "STORAGE",
                    "qualityType": "GOOD",
                    "capacityUnits": 1000,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))

    def test_04_duplicate_zone_should_fail(self):
        """库区管理-重复库区编码创建失败"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/zones",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        self.assertGreater(len(listed.get("data") or []), 0)
        zone = listed["data"][0]
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/zones",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "zoneCode": zone["zoneCode"],
                    "zoneName": "重复库区",
                    "zoneType": "STORAGE",
                    "qualityType": "GOOD",
                    "capacityUnits": 1000,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
