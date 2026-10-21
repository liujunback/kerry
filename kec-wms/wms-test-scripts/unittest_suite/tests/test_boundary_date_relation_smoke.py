from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestBoundaryDateRelationSmoke(FunctionalBaseCase):
    def _base_wave_strategy_payload(self):
        return {
            "warehouseId": self.base_data["warehouse_id"],
            "strategyCode": f"BOUNDARY-WAVE-{self.unique_tag[-6:]}",
            "strategyName": "Boundary Wave Strategy",
            "priority": 100,
            "status": "DRAFT",
            "rules": {
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
            },
        }


DATE_RELATION_SPECS = [
    (
        "boundary asn expected arrival date invalid format should fail",
        "POST",
        "/api/v1/asn",
        lambda self: {
            "clientId": self.base_data["client_id"],
            "warehouseId": self.base_data["warehouse_id"],
            "asnType": "NORMAL",
            "externalNumber": "BOUNDARY-DATE-ASN-001",
            "expectedArrivalDate": "not-a-date",
            "lines": [
                {
                    "skuId": self.base_data["sku_id"],
                    "skuCode": self.base_data["sku_code"],
                    "expectedQty": 1,
                }
            ],
        },
        True,
    ),
    (
        "boundary asn expected arrival time max length plus one should fail",
        "POST",
        "/api/v1/asn",
        lambda self: {
            "clientId": self.base_data["client_id"],
            "warehouseId": self.base_data["warehouse_id"],
            "asnType": "NORMAL",
            "externalNumber": "BOUNDARY-DATE-ASN-002",
            "expectedArrivalTime": "12:34:567",
            "lines": [
                {
                    "skuId": self.base_data["sku_id"],
                    "skuCode": self.base_data["sku_code"],
                    "expectedQty": 1,
                }
            ],
        },
        True,
    ),
    (
        "boundary asn expected qty zero should fail",
        "POST",
        "/api/v1/asn",
        lambda self: {
            "clientId": self.base_data["client_id"],
            "warehouseId": self.base_data["warehouse_id"],
            "asnType": "NORMAL",
            "externalNumber": "BOUNDARY-DATE-ASN-003",
            "lines": [
                {
                    "skuId": self.base_data["sku_id"],
                    "skuCode": self.base_data["sku_code"],
                    "expectedQty": 0,
                }
            ],
        },
        True,
    ),
    (
        "boundary wave strategy min orders greater than max should fail",
        "POST",
        "/api/v1/wave-strategies",
        lambda self: {
            **self._base_wave_strategy_payload(),
            "rules": {
                **self._base_wave_strategy_payload()["rules"],
                "waveTypeConfig": [
                    {
                        "code": "SINGLE_ONE_NORMAL",
                        "enabled": True,
                        "minOrdersPerWave": 10,
                        "maxOrdersPerWave": 1,
                        "pickMode": "BY_ORDER",
                        "downstreamMode": "PACK_DIRECT",
                    }
                ],
            },
        },
        False,
    ),
    (
        "boundary wave strategy duplicate field code should fail",
        "POST",
        "/api/v1/wave-strategies",
        lambda self: {
            **self._base_wave_strategy_payload(),
            "rules": {
                **self._base_wave_strategy_payload()["rules"],
                "filterConfig": {
                    **self._base_wave_strategy_payload()["rules"]["filterConfig"],
                    "conditionGroups": [
                        {
                            "id": "cg-1",
                            "groupNo": 1,
                            "logicOp": "AND",
                            "fieldCode": "platform",
                            "value": "AMZ",
                        },
                        {
                            "id": "cg-2",
                            "groupNo": 1,
                            "logicOp": "AND",
                            "fieldCode": "platform",
                            "value": "SHOPIFY",
                        },
                    ],
                },
            },
        },
        False,
    ),
    (
        "boundary wave strategy invalid schedule time should fail",
        "POST",
        "/api/v1/wave-strategies",
        lambda self: {
            **self._base_wave_strategy_payload(),
            "rules": {
                **self._base_wave_strategy_payload()["rules"],
                "triggerConfig": {
                    "modes": ["SCHEDULED"],
                    "scheduleTimes": ["2:00"],
                },
            },
        },
        False,
    ),
    (
        "boundary wave strategy empty trigger modes should fail",
        "POST",
        "/api/v1/wave-strategies",
        lambda self: {
            **self._base_wave_strategy_payload(),
            "rules": {
                **self._base_wave_strategy_payload()["rules"],
                "triggerConfig": {
                    "modes": [],
                    "scheduleTimes": [],
                },
            },
        },
        False,
    ),
    (
        "boundary wave strategy expected outbound datetime invalid should fail",
        "POST",
        "/api/v1/wave-strategies",
        lambda self: {
            **self._base_wave_strategy_payload(),
            "rules": {
                **self._base_wave_strategy_payload()["rules"],
                "filterConfig": {
                    **self._base_wave_strategy_payload()["rules"]["filterConfig"],
                    "expectedOutboundTime": {
                        "from": "invalid-datetime",
                        "to": "2026-05-20T10:00:00.000Z",
                    },
                },
            },
        },
        False,
    ),
]


def _make_date_relation_test(index, title, method, path, payload_factory, warehouse_scoped):
    def test_method(self):
        result = normalize_result(
            self.session.api_request(
                method,
                path,
                data=payload_factory(self),
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        self.assertFalse(result.get("success"), result.get("error") or result.get("message"))

    test_method.__name__ = f"test_{index:02d}_{title}".replace("/", "_").replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(DATE_RELATION_SPECS, start=1):
    setattr(
        TestBoundaryDateRelationSmoke,
        _make_date_relation_test(idx, *spec).__name__,
        _make_date_relation_test(idx, *spec),
    )
