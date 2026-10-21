from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestBoundaryStringLengthSmoke(FunctionalBaseCase):
    pass


def _build_asn_payload(self, **overrides):
    payload = {
        "clientId": self.base_data["client_id"],
        "warehouseId": self.base_data["warehouse_id"],
        "asnType": "NORMAL",
        "externalNumber": "BOUNDARY-ASN-001",
        "lines": [
            {
                "skuId": self.base_data["sku_id"],
                "skuCode": self.base_data["sku_code"],
                "expectedQty": 1,
            }
        ],
    }
    payload.update(overrides)
    return payload


STRING_LENGTH_SPECS = [
    (
        "boundary client code min length minus one should fail",
        "POST",
        "/api/v1/clients",
        lambda self: {"clientCode": "A", "clientName": "Boundary Client"},
        False,
    ),
    (
        "boundary client code max length plus one should fail",
        "POST",
        "/api/v1/clients",
        lambda self: {"clientCode": "A" * 33, "clientName": "Boundary Client"},
        False,
    ),
    (
        "boundary client code lowercase regex should fail",
        "POST",
        "/api/v1/clients",
        lambda self: {"clientCode": "lowercase", "clientName": "Boundary Client"},
        False,
    ),
    (
        "boundary warehouse code min length minus one should fail",
        "POST",
        "/api/v1/warehouses",
        lambda self: {"warehouseCode": "A", "warehouseName": "Boundary Warehouse"},
        False,
    ),
    (
        "boundary warehouse country max length plus one should fail",
        "POST",
        "/api/v1/warehouses",
        lambda self: {
            "warehouseCode": "BOUNDARY-WH-001",
            "warehouseName": "Boundary Warehouse",
            "warehouseType": "SELF_BUILT",
            "country": "CHN",
        },
        False,
    ),
    (
        "boundary zone code lowercase regex should fail",
        "POST",
        "/api/v1/zones",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "zoneCode": "zone-lower",
            "zoneName": "Boundary Zone",
            "zoneType": "STORAGE",
            "qualityType": "GOOD",
        },
        True,
    ),
    (
        "boundary zone code max length plus one should fail",
        "POST",
        "/api/v1/zones",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "zoneCode": "Z" * 33,
            "zoneName": "Boundary Zone",
            "zoneType": "STORAGE",
            "qualityType": "GOOD",
        },
        True,
    ),
    (
        "boundary bin location code min length minus one should fail",
        "POST",
        "/api/v1/bin-locations",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "zoneId": self.base_data["warehouse_id"],
            "locationCode": "A",
            "aisle": "A1",
            "rack": "01",
            "shelf": "01",
            "bin": "01",
            "locationType": "RACK",
            "isPickable": True,
            "isReceivable": True,
            "putawayPriority": 1,
            "pickPriority": 1,
            "pickSequence": 0,
            "maxSkuCount": 1,
        },
        True,
    ),
    (
        "boundary bin aisle max length plus one should fail",
        "POST",
        "/api/v1/bin-locations",
        lambda self: {
            "warehouseId": self.base_data["warehouse_id"],
            "zoneId": self.base_data["warehouse_id"],
            "locationCode": "BOUNDARY-BIN-001",
            "aisle": "A" * 9,
            "rack": "01",
            "shelf": "01",
            "bin": "01",
            "locationType": "RACK",
            "isPickable": True,
            "isReceivable": True,
            "putawayPriority": 1,
            "pickPriority": 1,
            "pickSequence": 0,
            "maxSkuCount": 1,
        },
        True,
    ),
    (
        "boundary sku code min length minus one should fail",
        "POST",
        "/api/v1/skus",
        lambda self: {
            "clientId": self.base_data["client_id"],
            "skuCode": "A",
            "skuName": "Boundary SKU",
        },
        False,
    ),
    (
        "boundary sku name max length plus one should fail",
        "POST",
        "/api/v1/skus",
        lambda self: {
            "clientId": self.base_data["client_id"],
            "skuCode": "BOUNDARY-SKU-001",
            "skuName": "S" * 257,
        },
        False,
    ),
    (
        "boundary asn external number max length plus one should fail",
        "POST",
        "/api/v1/asn",
        lambda self: _build_asn_payload(self, externalNumber="E" * 65),
        True,
    ),
    (
        "boundary asn line sku code max length plus one should fail",
        "POST",
        "/api/v1/asn",
        lambda self: _build_asn_payload(
            self,
            lines=[
                {
                    "skuId": self.base_data["sku_id"],
                    "skuCode": "S" * 65,
                    "expectedQty": 1,
                }
            ],
        ),
        True,
    ),
]


def _make_boundary_string_test(index, title, method, path, payload_factory, warehouse_scoped):
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


for idx, spec in enumerate(STRING_LENGTH_SPECS, start=1):
    setattr(
        TestBoundaryStringLengthSmoke,
        _make_boundary_string_test(idx, *spec).__name__,
        _make_boundary_string_test(idx, *spec),
    )
