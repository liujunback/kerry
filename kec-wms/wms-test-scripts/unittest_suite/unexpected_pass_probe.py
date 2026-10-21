import json
import os
import sys
import time
from typing import Any, Callable, Dict, List, Optional

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from common import WmsSession, get_config, normalize_result, resolve_base_data


def cleanup_delete(session: WmsSession, path: str, warehouse_id: Optional[str] = None) -> Dict[str, Any]:
    return normalize_result(session.api_request("DELETE", path, warehouse_id=warehouse_id))


def run() -> int:
    session = WmsSession(get_config())
    session.login()
    base_data = resolve_base_data(session)
    unique_tag = str(int(time.time() * 1000))
    created_resources: List[tuple[str, Optional[str]]] = []
    results: List[Dict[str, Any]] = []

    def probe(
        name: str,
        method: str,
        path: str,
        *,
        query: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        warehouse_id: Optional[str] = None,
        cleanup: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> None:
        result = normalize_result(
            session.api_request(
                method,
                path,
                query=query,
                data=data,
                warehouse_id=warehouse_id,
            )
        )
        status = "unexpected_pass" if result.get("success") else "expected_block"
        results.append(
            {
                "name": name,
                "status": status,
                "path": path,
                "method": method,
                "message": result.get("message") or "",
                "data": result.get("data"),
            }
        )
        if result.get("success") and cleanup:
            cleanup(result)

    def remember_delete(path: str, warehouse_id: Optional[str] = None) -> None:
        created_resources.append((path, warehouse_id))

    probe(
        "client contactPhone garbage characters",
        "POST",
        "/api/v1/clients",
        data={
            "clientCode": f"UPC-{unique_tag[-6:]}",
            "clientName": "Unexpected Pass Client",
            "contactPhone": "abc###@@@",
        },
        cleanup=lambda result: remember_delete(f"/api/v1/clients/{result['data']['id']}"),
    )

    probe(
        "warehouse country invalid characters",
        "POST",
        "/api/v1/warehouses",
        data={
            "warehouseCode": f"UPW-{unique_tag[-6:]}",
            "warehouseName": "Unexpected Pass Warehouse",
            "warehouseType": "SELF_BUILT",
            "country": "1@",
        },
        cleanup=lambda result: remember_delete(f"/api/v1/warehouses/{result['data']['id']}"),
    )

    probe(
        "sku code special characters and spaces",
        "POST",
        "/api/v1/skus",
        data={
            "clientId": base_data["client_id"],
            "skuCode": f"中文 SKU ! {unique_tag[-4:]}",
            "skuName": "Unexpected Pass SKU",
        },
        cleanup=lambda result: remember_delete(f"/api/v1/skus/{result['data']['id']}"),
    )

    probe(
        "asn expectedArrivalTime semantic invalid",
        "POST",
        "/api/v1/asn",
        data={
            "clientId": base_data["client_id"],
            "warehouseId": base_data["warehouse_id"],
            "asnType": "NORMAL",
            "externalNumber": f"UP-ASN-{unique_tag[-6:]}",
            "expectedArrivalTime": "99:99:99",
            "lines": [
                {
                    "skuId": base_data["sku_id"],
                    "skuCode": base_data["sku_code"],
                    "expectedQty": 1,
                }
            ],
        },
        warehouse_id=base_data["warehouse_id"],
        cleanup=lambda result: remember_delete(
            f"/api/v1/asn/{result['data']['id']}",
            base_data["warehouse_id"],
        ),
    )

    probe(
        "returns sortBy arbitrary field",
        "GET",
        "/api/v1/returns",
        query={"sortBy": "madeUpField", "page": 1, "pageSize": 5},
    )

    probe(
        "outbound orders sortBy arbitrary field",
        "GET",
        "/api/v1/outbound-orders",
        query={"sortBy": "totallyInvalid", "page": 1, "pageSize": 5},
        warehouse_id=base_data["warehouse_id"],
    )

    probe(
        "wave strategy scheduleTimes invalid semantics",
        "POST",
        "/api/v1/wave-strategies",
        data={
            "warehouseId": base_data["warehouse_id"],
            "strategyCode": f"UPWAVE-{unique_tag[-6:]}",
            "strategyName": "Unexpected Pass Wave",
            "priority": 100,
            "status": "DRAFT",
            "rules": {
                "triggerConfig": {
                    "modes": ["SCHEDULED"],
                    "scheduleTimes": ["25:99"],
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
        },
    )

    cleanup_results: List[Dict[str, Any]] = []
    for path, warehouse_id in reversed(created_resources):
        cleanup_results.append(
            {
                "path": path,
                "warehouse_id": warehouse_id,
                "result": cleanup_delete(session, path, warehouse_id),
            }
        )

    summary = {
        "run_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "base_url": session.config["base_url"],
        "tenant_code": session.config["tenant_code"],
        "username": session.config["username"],
        "results": results,
        "cleanup_results": cleanup_results,
    }

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
