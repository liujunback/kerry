from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestBinLocationsManagement(FunctionalBaseCase):
    def _get_zone_id(self):
        zones = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/zones",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(zones.get("success"), zones.get("message"))
        for item in zones.get("data") or []:
            if item.get("zoneType") == "STORAGE":
                return item["id"]
        self.skipTest("当前环境没有可用 STORAGE 库区")

    def test_01_list_bin_locations_should_succeed(self):
        """库位管理-库位列表查询成功"""
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/bin-locations",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 20},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))
        self.assertIsInstance(result.get("data"), list)

    def test_02_bin_location_detail_should_succeed(self):
        """库位管理-库位详情查询成功"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/bin-locations",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        self.assertGreater(len(listed.get("data") or []), 0)
        location_id = listed["data"][0]["id"]
        detail = normalize_result(
            self.session.api_request("GET", f"/api/v1/bin-locations/{location_id}", warehouse_id=self.base_data["warehouse_id"])
        )
        self.assertTrue(detail.get("success"), detail.get("message"))

    def test_03_create_bin_location_should_succeed(self):
        """库位管理-创建库位成功"""
        zone_id = self._get_zone_id()
        location_code = f"AUTO-BIN-{self.unique_tag[-6:]}"
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/bin-locations",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "zoneId": zone_id,
                    "locationCode": location_code,
                    "aisle": "AUTO",
                    "rack": "01",
                    "shelf": "01",
                    "bin": "01",
                    "locationType": "RACK",
                    "isPickable": True,
                    "isReceivable": True,
                    "putawayPriority": 100,
                    "pickPriority": 100,
                    "pickSequence": 1,
                    "maxSkuCount": 1,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(result.get("success"), result.get("message"))

    def test_04_duplicate_bin_location_should_fail(self):
        """库位管理-重复库位编码创建失败"""
        listed = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/bin-locations",
                query={"warehouseId": self.base_data["warehouse_id"], "pageSize": 1},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertTrue(listed.get("success"), listed.get("message"))
        self.assertGreater(len(listed.get("data") or []), 0)
        location = listed["data"][0]
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/bin-locations",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "zoneId": self._get_zone_id(),
                    "locationCode": location["locationCode"],
                    "aisle": "AUTO",
                    "rack": "01",
                    "shelf": "01",
                    "bin": "01",
                    "locationType": "RACK",
                    "isPickable": True,
                    "isReceivable": True,
                    "putawayPriority": 100,
                    "pickPriority": 100,
                    "pickSequence": 1,
                    "maxSkuCount": 1,
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"))
