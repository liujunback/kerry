import os
import sys
import time
import unittest
from typing import Any, Dict, List, Optional

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from common import WmsSession, get_config, normalize_result, resolve_base_data


class ProbeUnexpectedPassCases(unittest.TestCase):
    PROBE_WAVE_CODE = "UNEXPECTED-PASS-WAVE-PROBE"

    @classmethod
    def setUpClass(cls) -> None:
        cls.session = WmsSession(get_config())
        cls.session.login()
        cls.base_data = resolve_base_data(cls.session)
        cls.wave_strategy_id = cls._ensure_probe_wave_strategy()

    @classmethod
    def _extract_list(cls, result: Dict[str, Any]) -> List[Dict[str, Any]]:
        payload = result.get("data")
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("items", "rows", "data"):
                if isinstance(payload.get(key), list):
                    return payload.get(key) or []
        return []

    @classmethod
    def _base_wave_rules(cls) -> Dict[str, Any]:
        return {
            "triggerConfig": {
                "modes": ["MANUAL"],
                "scheduleTimes": [],
            },
            "filterConfig": {
                "orderBusinessTypes": [],
                "clientIds": [],
                "platforms": [],
                "shippingMethods": [],
                "zoneIds": [],
                "groupJoinMode": "AND",
                "conditionGroups": [],
            },
            "executionConfig": {
                "enableOrderLimit": False,
                "batchSortField": "expectedOutboundTime",
                "batchSortDirection": "asc",
            },
            "waveTypeConfig": [
                {
                    "code": "SINGLE_ONE_NORMAL",
                    "enabled": True,
                    "minOrdersPerWave": 1,
                    "maxOrdersPerWave": 10,
                    "pickMode": "BY_ORDER",
                    "downstreamMode": "PACK_DIRECT",
                }
            ],
            "pickConfig": {
                "crossZoneSplitMode": "NO_SPLIT",
                "enableMaxOrderLimit": False,
                "pathOptimizeMode": "LOCATION_ASC",
            },
            "releaseConfig": {
                "releaseMode": "MANUAL",
                "autoAssignPicker": False,
            },
        }

    @classmethod
    def _ensure_probe_wave_strategy(cls) -> str:
        listed = normalize_result(
            cls.session.api_request(
                "GET",
                "/api/v1/wave-strategies",
                query={"page": 1, "pageSize": 10, "search": cls.PROBE_WAVE_CODE},
            )
        )
        if listed.get("success"):
            rows = cls._extract_list(listed)
            for row in rows:
                if row.get("strategyCode") == cls.PROBE_WAVE_CODE:
                    return row["id"]

        created = normalize_result(
            cls.session.api_request(
                "POST",
                "/api/v1/wave-strategies",
                data={
                    "warehouseId": cls.base_data["warehouse_id"],
                    "strategyCode": cls.PROBE_WAVE_CODE,
                    "strategyName": "Unexpected Pass Wave Probe",
                    "priority": 100,
                    "status": "DRAFT",
                    "rules": cls._base_wave_rules(),
                },
            )
        )
        if created.get("success") and created.get("data", {}).get("id"):
            return created["data"]["id"]

        raise RuntimeError(created.get("message") or "初始化波次策略探针失败")

    def setUp(self) -> None:
        self.unique_tag = str(int(time.time() * 1000))
        self.resources: List[Dict[str, Any]] = []

    def tearDown(self) -> None:
        for item in reversed(self.resources):
            resource_type = item["type"]
            if resource_type == "asn":
                normalize_result(
                    self.session.api_request(
                        "DELETE",
                        f"/api/v1/asn/{item['id']}",
                        warehouse_id=item["warehouse_id"],
                    )
                )
            elif resource_type == "sku":
                normalize_result(self.session.api_request("DELETE", f"/api/v1/skus/{item['id']}"))
            elif resource_type == "client_warehouse":
                normalize_result(
                    self.session.api_request(
                        "DELETE",
                        f"/api/v1/clients/{item['client_id']}/warehouses/{item['warehouse_id']}",
                    )
                )
            elif resource_type == "client":
                normalize_result(self.session.api_request("DELETE", f"/api/v1/clients/{item['id']}"))

    def _remember(self, resource_type: str, **kwargs) -> None:
        entry = {"type": resource_type}
        entry.update(kwargs)
        self.resources.append(entry)

    def _create_probe_client(self, suffix: str) -> str:
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/clients",
                data={
                    "clientCode": f"UPC-{suffix}",
                    "clientName": f"Unexpected Pass Client {suffix}",
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        client_id = result["data"]["id"]
        self._remember("client", id=client_id)
        return client_id

    def _bind_client_warehouse(self, client_id: str) -> None:
        result = normalize_result(
            self.session.api_request(
                "POST",
                f"/api/v1/clients/{client_id}/warehouses",
                data={
                    "warehouseId": self.base_data["warehouse_id"],
                    "isDefault": True,
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        self._remember("client_warehouse", client_id=client_id, warehouse_id=self.base_data["warehouse_id"])

    def _create_probe_sku(self, client_id: str, suffix: str) -> str:
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/skus",
                data={
                    "clientId": client_id,
                    "skuCode": f"UP-SKU-{suffix}",
                    "skuName": f"Unexpected Pass SKU {suffix}",
                },
            )
        )
        self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        sku_id = result["data"]["id"]
        self._remember("sku", id=sku_id)
        return sku_id

    def test_client_contact_phone_garbage_should_fail(self):
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/clients",
                data={
                    "clientCode": f"UPC-{self.unique_tag[-6:]}",
                    "clientName": "Unexpected Pass Client",
                    "contactPhone": "abc###@@@",
                },
            )
        )
        if result.get("success"):
            self._remember("client", id=result["data"]["id"])
        self.assertFalse(result.get("success"), result.get("message") or "客户脏电话意外通过")

    def test_warehouse_country_invalid_characters_should_fail(self):
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/warehouses",
                data={
                    "warehouseCode": f"UPW-{self.unique_tag[-6:]}",
                    "warehouseName": "Unexpected Pass Warehouse",
                    "warehouseType": "SELF_BUILT",
                    "country": "1@",
                },
            )
        )
        self.assertFalse(result.get("success"), result.get("message") or "仓库国家非法字符意外通过")

    def test_sku_code_special_characters_should_fail(self):
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/skus",
                data={
                    "clientId": self.base_data["client_id"],
                    "skuCode": f"中文 SKU ! {self.unique_tag[-4:]}",
                    "skuName": "Unexpected Pass SKU",
                },
            )
        )
        if result.get("success"):
            self._remember("sku", id=result["data"]["id"])
        self.assertFalse(result.get("success"), result.get("message") or "SKU 编码特殊字符意外通过")

    def test_wave_strategy_schedule_times_invalid_semantics_should_fail(self):
        try:
            result = normalize_result(
                self.session.api_request(
                    "PUT",
                    f"/api/v1/wave-strategies/{self.wave_strategy_id}",
                    data={
                        "strategyCode": self.PROBE_WAVE_CODE,
                        "strategyName": "Unexpected Pass Wave Probe",
                        "priority": 100,
                        "status": "DRAFT",
                        "rules": {
                            **self._base_wave_rules(),
                            "triggerConfig": {
                                "modes": ["SCHEDULED"],
                                "scheduleTimes": ["25:99"],
                            },
                        },
                    },
                )
            )
            self.assertFalse(result.get("success"), result.get("message") or "波次策略非法时间语义意外通过")
        finally:
            normalize_result(
                self.session.api_request(
                    "PUT",
                    f"/api/v1/wave-strategies/{self.wave_strategy_id}",
                    data={
                        "strategyCode": self.PROBE_WAVE_CODE,
                        "strategyName": "Unexpected Pass Wave Probe",
                        "priority": 100,
                        "status": "DRAFT",
                        "rules": self._base_wave_rules(),
                    },
                )
            )

    def test_asn_expected_arrival_time_invalid_semantics_should_fail(self):
        suffix = self.unique_tag[-6:]
        client_id = self._create_probe_client(suffix)
        self._bind_client_warehouse(client_id)
        sku_id = self._create_probe_sku(client_id, suffix)
        result = normalize_result(
            self.session.api_request(
                "POST",
                "/api/v1/asn",
                data={
                    "clientId": client_id,
                    "warehouseId": self.base_data["warehouse_id"],
                    "asnType": "NORMAL",
                    "externalNumber": f"UP-ASN-{suffix}",
                    "expectedArrivalTime": "99:99:99",
                    "lines": [
                        {
                            "skuId": sku_id,
                            "skuCode": f"UP-SKU-{suffix}",
                            "expectedQty": 1,
                        }
                    ],
                },
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        if result.get("success"):
            self._remember("asn", id=result["data"]["id"], warehouse_id=self.base_data["warehouse_id"])
        self.assertFalse(result.get("success"), result.get("message") or "ASN 非法时间语义意外通过")

    def test_clients_sort_by_arbitrary_field_should_fail(self):
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/clients",
                query={"sortBy": "madeUpField", "page": 1, "pageSize": 5},
            )
        )
        self.assertFalse(result.get("success"), result.get("message") or "clients sortBy 任意字段意外通过")

    def test_returns_sort_by_arbitrary_field_should_fail(self):
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/returns",
                query={"sortBy": "madeUpField", "page": 1, "pageSize": 5},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"), result.get("message") or "returns sortBy 任意字段意外通过")

    def test_outbound_orders_sort_by_arbitrary_field_should_fail(self):
        result = normalize_result(
            self.session.api_request(
                "GET",
                "/api/v1/outbound-orders",
                query={"sortBy": "totallyInvalid", "page": 1, "pageSize": 5},
                warehouse_id=self.base_data["warehouse_id"],
            )
        )
        self.assertFalse(result.get("success"), result.get("message") or "outbound sortBy 任意字段意外通过")
