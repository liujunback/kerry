from common import normalize_result
from unittest_suite.tests.functional_base_case import FunctionalBaseCase


class TestBoundaryQueryParamSmoke(FunctionalBaseCase):
    pass


QUERY_BOUNDARY_SPECS = [
    (
        "boundary clients page zero should fallback succeed",
        "/api/v1/clients",
        {"page": 0, "pageSize": 5},
        False,
        True,
    ),
    (
        "boundary clients page size max plus one should fallback succeed",
        "/api/v1/clients",
        {"page": 1, "pageSize": 1001},
        False,
        True,
    ),
    (
        "boundary warehouses invalid status should fail",
        "/api/v1/warehouses",
        {"status": "BROKEN"},
        False,
        False,
    ),
    (
        "boundary zones invalid zone type should fail",
        "/api/v1/zones",
        {"warehouseId": "00000000-0000-0000-0000-000000000001", "zoneType": "BROKEN"},
        True,
        False,
    ),
    (
        "boundary bin locations invalid sort order should fail",
        "/api/v1/bin-locations",
        {"warehouseId": "00000000-0000-0000-0000-000000000001", "sortOrder": "sideways"},
        True,
        False,
    ),
    (
        "boundary skus invalid storage condition should fail",
        "/api/v1/skus",
        {"clientId": "00000000-0000-0000-0000-000000000001", "storageCondition": "HOT"},
        False,
        False,
    ),
    (
        "boundary asn page zero should fallback succeed",
        "/api/v1/asn",
        {"page": 0, "pageSize": 5, "warehouseId": "a784c678-e1e0-4ff3-b8c2-d33d383c71a6"},
        True,
        True,
    ),
    (
        "boundary asn invalid status should fail",
        "/api/v1/asn",
        {"status": "BROKEN", "warehouseId": "00000000-0000-0000-0000-000000000001"},
        True,
        False,
    ),
    (
        "boundary wave strategies page size max plus one should fallback succeed",
        "/api/v1/wave-strategies",
        {"page": 1, "pageSize": 2001},
        False,
        True,
    ),
    (
        "boundary wave strategies invalid time preset should fail",
        "/api/v1/wave-strategies",
        {"timePreset": "last90days"},
        False,
        False,
    ),
    (
        "boundary wave strategy runs invalid run mode should fail",
        "/api/v1/wave-strategy-runs",
        {"runMode": "BROKEN"},
        False,
        False,
    ),
    (
        "boundary wave strategy runs reason code max length plus one should fail",
        "/api/v1/wave-strategy-runs",
        {"reasonCode": "R" * 65, "page": 1, "pageSize": 20},
        False,
        False,
    ),
]


def _make_query_boundary_test(index, title, path, query, warehouse_scoped, expected_success):
    def test_method(self):
        result = normalize_result(
            self.session.api_request(
                "GET",
                path,
                query=query,
                warehouse_id=self.base_data["warehouse_id"] if warehouse_scoped else None,
            )
        )
        if expected_success:
            self.assertTrue(result.get("success"), result.get("error") or result.get("message"))
        else:
            self.assertFalse(result.get("success"), result.get("data") or result.get("message"))

    test_method.__name__ = f"test_{index:02d}_{title}".replace("/", "_").replace("-", "_")
    test_method.__doc__ = title
    return test_method


for idx, spec in enumerate(QUERY_BOUNDARY_SPECS, start=1):
    setattr(
        TestBoundaryQueryParamSmoke,
        _make_query_boundary_test(idx, *spec).__name__,
        _make_query_boundary_test(idx, *spec),
    )
