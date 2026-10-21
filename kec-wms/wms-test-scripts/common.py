import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

import requests


def get_config() -> Dict[str, str]:
    return {
        "base_url": os.getenv("WMS_BASE_URL", "https://stg-kec-wms.kec-app.com").rstrip("/"),
        "tenant_code": os.getenv("WMS_TENANT_CODE", "DEFAULT"),
        "username": os.getenv("WMS_USERNAME", "admin@kln.com"),
        "password": os.getenv("WMS_PASSWORD", "Admin@123"),
        "warehouse_code": os.getenv("WMS_WAREHOUSE_CODE", "WH-SH-001"),
        "client_code": os.getenv("WMS_CLIENT_CODE", "C001"),
        "sku_code": os.getenv("WMS_SKU_CODE", ""),
        "strict_allocate": os.getenv("WMS_STRICT_ALLOCATE", "false"),
        "use_system_proxy": os.getenv("WMS_USE_SYSTEM_PROXY", "false"),
        "auto_create_sku": os.getenv("WMS_AUTO_CREATE_SKU", "true"),
    }


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def build_forwarded_for(tenant_code: str, username: str) -> str:
    seed = sum(ord(ch) for ch in f"{tenant_code}:{username}")
    return f"10.{(seed % 200) + 10}.{((seed // 7) % 200) + 10}.{((seed // 13) % 200) + 10}"


@dataclass
class WmsSession:
    config: Dict[str, str]
    client: requests.Session = field(default_factory=requests.Session)
    warehouse_id: Optional[str] = None
    base_data: Optional[Dict[str, str]] = None

    def __post_init__(self) -> None:
        use_system_proxy = str(self.config.get("use_system_proxy", "false")).lower() == "true"
        if not use_system_proxy:
            self.client.trust_env = False

    def login(self) -> None:
        last_error: Optional[Exception] = None
        for attempt in range(1, 4):
            try:
                csrf_resp = self.client.get(f"{self.config['base_url']}/api/auth/csrf", timeout=30)
                csrf_resp.raise_for_status()
                csrf_body = csrf_resp.json()
                csrf_token = csrf_body.get("csrfToken") if isinstance(csrf_body, dict) else None
                ensure(bool(csrf_token), "获取 csrfToken 失败")

                forwarded_for = build_forwarded_for(self.config["tenant_code"], self.config["username"])
                login_resp = self.client.post(
                    f"{self.config['base_url']}/api/auth/callback/credentials",
                    data={
                        "csrfToken": csrf_token,
                        "tenantCode": self.config["tenant_code"],
                        "username": self.config["username"],
                        "password": self.config["password"],
                        "callbackUrl": f"{self.config['base_url']}/dashboard",
                        "json": "true",
                    },
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded",
                        "x-forwarded-for": forwarded_for,
                        "x-real-ip": forwarded_for,
                    },
                    allow_redirects=False,
                    timeout=30,
                )

                if login_resp.status_code not in (200, 302):
                    raise RuntimeError(f"登录失败，状态码: {login_resp.status_code}")

                session_body = None
                for _ in range(3):
                    session_resp = self.client.get(f"{self.config['base_url']}/api/auth/session", timeout=30)
                    session_resp.raise_for_status()
                    session_body = session_resp.json()
                    if isinstance(session_body, dict) and session_body.get("user"):
                        break
                    time.sleep(1)
                if not isinstance(session_body, dict):
                    raise RuntimeError("登录后未建立会话")
                ensure(bool(session_body.get("user")), "登录后未建立会话")
                return
            except Exception as exc:
                last_error = exc
                if attempt == 3:
                    break
                time.sleep(attempt)

        if last_error:
            raise last_error

        csrf_resp = self.client.get(f"{self.config['base_url']}/api/auth/csrf", timeout=30)
        csrf_resp.raise_for_status()
        csrf_token = csrf_resp.json().get("csrfToken")
        ensure(bool(csrf_token), "获取 csrfToken 失败")

        forwarded_for = build_forwarded_for(self.config["tenant_code"], self.config["username"])
        login_resp = self.client.post(
            f"{self.config['base_url']}/api/auth/callback/credentials",
            data={
                "csrfToken": csrf_token,
                "tenantCode": self.config["tenant_code"],
                "username": self.config["username"],
                "password": self.config["password"],
                "callbackUrl": f"{self.config['base_url']}/dashboard",
                "json": "true",
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "x-forwarded-for": forwarded_for,
                "x-real-ip": forwarded_for,
            },
            allow_redirects=False,
            timeout=30,
        )

        if login_resp.status_code not in (200, 302):
            raise RuntimeError(f"登录失败，状态码: {login_resp.status_code}")

        session_resp = self.client.get(f"{self.config['base_url']}/api/auth/session", timeout=30)
        session_resp.raise_for_status()
        session_body = session_resp.json()
        ensure(bool(session_body.get("user")), "登录后未建立会话")

    def api_request(
        self,
        method: str,
        path: str,
        *,
        query: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        warehouse_id: Optional[str] = None,
        timeout: int = 30,
    ) -> Dict[str, Any]:
        target_warehouse_id = warehouse_id or (data or {}).get("warehouseId") or (query or {}).get("warehouseId") or self.warehouse_id
        headers: Dict[str, str] = {}
        if target_warehouse_id:
            headers["X-WMS-Warehouse-Id"] = str(target_warehouse_id)
            self.warehouse_id = str(target_warehouse_id)

        response = self.client.request(
            method=method.upper(),
            url=f"{self.config['base_url']}{path}",
            params=query,
            json=data if method.upper() != "GET" else None,
            headers=headers,
            timeout=timeout,
        )
        try:
            body = response.json()
        except Exception:
            body = {"success": False, "message": response.text}
        return {"status": response.status_code, "ok": response.ok, "body": body}


def normalize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    body = result["body"]
    if "success" not in body:
        normalized = dict(body)
        normalized["success"] = result["ok"]
        if "message" not in normalized and isinstance(normalized.get("data"), dict):
            maybe_message = normalized["data"].get("message")
            if maybe_message:
                normalized["message"] = maybe_message
        return normalized
    return body


def resolve_base_data(session: WmsSession) -> Dict[str, str]:
    if session.base_data:
        return session.base_data

    wh = session.api_request("GET", "/api/v1/warehouses", query={"search": session.config["warehouse_code"], "pageSize": 5})
    ensure(wh["body"].get("success") and wh["body"].get("data"), f"未找到仓库: {session.config['warehouse_code']}")
    warehouse = wh["body"]["data"][0]
    session.warehouse_id = warehouse["id"]

    client = session.api_request("GET", "/api/v1/clients", query={"search": session.config["client_code"], "pageSize": 5})
    ensure(client["body"].get("success") and client["body"].get("data"), f"未找到客户: {session.config['client_code']}")
    client_item = client["body"]["data"][0]

    sku_query: Dict[str, Any] = {"clientId": client_item["id"], "pageSize": 5}
    if session.config["sku_code"]:
        sku_query["search"] = session.config["sku_code"]

    sku = session.api_request("GET", "/api/v1/skus", query=sku_query, warehouse_id=warehouse["id"])
    ensure(sku["body"].get("success") and sku["body"].get("data"), "未找到可用 SKU")
    sku_item = sku["body"]["data"][0]

    session.base_data = {
        "warehouse_id": warehouse["id"],
        "warehouse_code": warehouse["warehouseCode"],
        "client_id": client_item["id"],
        "client_code": client_item["clientCode"],
        "sku_id": sku_item["id"],
        "sku_code": sku_item["skuCode"],
    }
    return session.base_data


def get_inventory(session: WmsSession, params: Dict[str, Any]) -> Dict[str, Any]:
    return session.api_request("GET", "/api/v1/inventory", query=params, warehouse_id=params.get("warehouseId"))


def create_sku(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", "/api/v1/skus", data=data))


def create_test_sku(session: WmsSession, base_data: Dict[str, str], unique_tag: str) -> Dict[str, Any]:
    sku_code = f"AUTO-SKU-{unique_tag[-10:]}"
    payload = {
        "clientId": base_data["client_id"],
        "skuCode": sku_code,
        "skuName": f"Auto Test SKU {unique_tag[-6:]}",
        "barcode": sku_code,
        "unit": "PCS",
        "storageCondition": "NORMAL",
        "isBatchManaged": False,
        "isSerialManaged": False,
        "isLotManaged": False,
        "isExpiryManaged": False,
        "isSelfPackaged": False,
        "notes": f"Auto created by unittest flow {unique_tag}",
    }
    return create_sku(session, payload)


def create_asn(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    result = session.api_request("POST", "/api/v1/asn", data=data, warehouse_id=data.get("warehouseId"))
    body = result["body"]
    if body.get("success") and body.get("data", {}).get("asnLines"):
        body["data"]["lines"] = [
            {
                "id": line["id"],
                "skuCode": line.get("skuCode"),
                "expectedQty": line.get("expectedQty"),
                "status": line.get("status"),
            }
            for line in body["data"]["asnLines"]
        ]
    return body


def sign_in_asn(session: WmsSession, asn_id: str) -> Dict[str, Any]:
    return session.api_request("POST", f"/api/v1/asn/{asn_id}/sign-in", data={}, warehouse_id=session.warehouse_id)["body"]


def receive_sku_to_asn(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return session.api_request(
        "POST",
        f"/api/v1/asn/{data['asnId']}/receiving/sku",
        data=data,
        warehouse_id=session.warehouse_id,
    )["body"]


def prepare_available_inventory(session: WmsSession, base_data: Dict[str, str], quantity: int) -> Dict[str, Any]:
    batch_number = f"BATCH-{int(time.time() * 1000)}"
    asn = create_asn(
        session,
        {
            "clientId": base_data["client_id"],
            "warehouseId": base_data["warehouse_id"],
            "asnType": "NORMAL",
            "externalNumber": f"EXT-{int(time.time() * 1000)}",
            "lines": [
                {
                    "skuId": base_data["sku_id"],
                    "skuCode": base_data["sku_code"],
                    "expectedQty": quantity,
                }
            ],
        },
    )
    if not asn.get("success"):
        return asn

    sign = sign_in_asn(session, asn["data"]["id"])
    if not sign.get("success"):
        return sign

    receive = receive_sku_to_asn(
        session,
        {
            "asnId": asn["data"]["id"],
            "asnLineId": asn["data"]["lines"][0]["id"],
            "receivedQty": quantity,
            "qualityStatus": "GOOD",
            "batchNumber": batch_number,
            "receivingMode": "SKU",
        },
    )
    if not receive.get("success"):
        return receive

    bins = session.api_request(
        "GET",
        "/api/v1/bin-locations",
        query={"warehouseId": base_data["warehouse_id"], "isReceivable": True, "pageSize": 100},
        warehouse_id=base_data["warehouse_id"],
    )["body"]
    if not bins.get("success") or not bins.get("data"):
        return {"success": False, "message": "未找到可上架库位"}

    candidates = []
    for item in bins["data"]:
        if item.get("isReceivable") is False:
            continue
        if item.get("status") and item["status"] != "ACTIVE":
            continue
        if item.get("lockStatus") and item["lockStatus"] != "UNLOCKED":
            continue
        zone = item.get("zone") or {}
        if zone.get("qualityType") and zone["qualityType"] != "GOOD":
            continue
        candidates.append(item)

    if not candidates:
        return {"success": False, "message": "没有可用良品库位"}

    target_location = None
    for candidate in candidates:
        inventory = get_inventory(
            session,
            {
                "warehouseId": base_data["warehouse_id"],
                "locationId": candidate["id"],
            },
        )["body"]
        if inventory.get("success") and not inventory.get("data"):
            target_location = candidate
            break

    if not target_location:
        zones = session.api_request(
            "GET",
            "/api/v1/zones",
            query={"warehouseId": base_data["warehouse_id"], "pageSize": 100},
            warehouse_id=base_data["warehouse_id"],
        )["body"]
        if not zones.get("success") or not zones.get("data"):
            return {"success": False, "message": "没有可用空库位，且查询库区失败，无法自动创建临时库位"}

        target_zone = None
        for zone in zones["data"]:
            if zone.get("zoneType") != "STORAGE":
                continue
            if zone.get("qualityType") and zone["qualityType"] != "GOOD":
                continue
            target_zone = zone
            break

        if not target_zone:
            return {"success": False, "message": "没有可用空库位，且未找到可创建临时库位的良品存储区"}

        temp_code = f"AUTO-EMPTY-{int(time.time() * 1000)}"
        created = session.api_request(
            "POST",
            "/api/v1/bin-locations",
            data={
                "warehouseId": base_data["warehouse_id"],
                "zoneId": target_zone["id"],
                "locationCode": temp_code,
                "aisle": "AUTO",
                "rack": "01",
                "shelf": "01",
                "bin": "01",
                "locationType": "RACK",
                "isPickable": True,
                "isReceivable": True,
                "putawayPriority": 100,
                "pickPriority": 100,
                "pickSequence": 0,
                "maxSkuCount": 1,
            },
            warehouse_id=base_data["warehouse_id"],
        )["body"]
        if not created.get("success") or not created.get("data", {}).get("id"):
            return {
                "success": False,
                "message": created.get("message", "没有可用空库位，自动创建临时库位失败"),
            }

        target_location = created["data"]
        print(f"[INFO] 已自动创建临时空库位: {target_location.get('locationCode')}")

    putaway_order = session.api_request(
        "POST",
        "/api/v1/putaway/orders",
        data={"putawayMode": "TASK_MODE", "asnLineIds": [asn["data"]["lines"][0]["id"]]},
        warehouse_id=base_data["warehouse_id"],
    )["body"]
    if not putaway_order.get("success") or not putaway_order.get("data"):
        return {"success": False, "message": putaway_order.get("message", "创建上架单失败")}

    putaway_order_id = putaway_order["data"][0]["id"]
    putaway_detail = session.api_request(
        "GET",
        f"/api/v1/putaway/orders/{putaway_order_id}",
        warehouse_id=base_data["warehouse_id"],
    )["body"]
    putaway_line_id = None
    if putaway_detail.get("success") and putaway_detail.get("data", {}).get("lines"):
        putaway_line_id = putaway_detail["data"]["lines"][0]["id"]

    shelving_payload = {
        "mode": "sku",
        "locationId": target_location["id"],
        "locationCode": target_location["locationCode"],
        "skuId": base_data["sku_id"],
        "skuCode": base_data["sku_code"],
        "quantity": quantity,
        "serialNumbers": [],
        "warehouseId": base_data["warehouse_id"],
        "clientId": base_data["client_id"],
        "putawayOrderId": putaway_order_id,
        "batchNumber": batch_number,
        "qualityStatus": "GOOD",
    }
    if putaway_line_id:
        shelving_payload["putawayLineId"] = putaway_line_id

    shelving = session.api_request(
        "POST",
        "/api/v1/shelving",
        data=shelving_payload,
        warehouse_id=base_data["warehouse_id"],
    )["body"]
    if not shelving.get("success"):
        return {"success": False, "message": shelving.get("message", "上架失败")}

    return {
        "success": True,
        "data": {
            "asn": asn,
            "receive": receive,
            "location": target_location,
            "putaway_order_id": putaway_order_id,
        },
    }


def create_outbound_order(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", "/api/v1/outbound-orders", data=data, warehouse_id=data.get("warehouseId")))


def batch_allocate_inventory(session: WmsSession, order_ids: List[str]) -> Dict[str, Any]:
    return normalize_result(session.api_request(
        "POST",
        "/api/v1/outbound-orders/batch-allocate",
        data={"orderIds": order_ids},
        warehouse_id=session.warehouse_id,
    ))


def get_outbound_order_detail(session: WmsSession, order_id: str) -> Dict[str, Any]:
    return normalize_result(session.api_request("GET", f"/api/v1/outbound-orders/{order_id}", warehouse_id=session.warehouse_id))


def get_outbound_orders(session: WmsSession, params: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("GET", "/api/v1/outbound-orders", query=params, warehouse_id=params.get("warehouseId")))


def wait_for_order_status(session: WmsSession, order_id: str, expected_status: str, timeout_seconds: int = 15) -> Dict[str, Any]:
    deadline = time.time() + timeout_seconds
    latest: Dict[str, Any] = {}
    while time.time() < deadline:
        latest = get_outbound_order_detail(session, order_id)
        if latest.get("success") and latest.get("data", {}).get("status") == expected_status:
            return latest
        time.sleep(0.5)
    return latest


def create_pick_order(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    result = normalize_result(session.api_request("POST", "/api/v1/pick-orders", data=data, warehouse_id=data.get("warehouseId")))
    if result.get("success") and result.get("data", {}).get("taskNumber") and not result["data"].get("pickOrderNumber"):
        result["data"]["pickOrderNumber"] = result["data"]["taskNumber"]
    return result


def get_pick_orders(session: WmsSession, params: Dict[str, Any]) -> Dict[str, Any]:
    result = normalize_result(session.api_request("GET", "/api/v1/pick-orders", query=params, warehouse_id=params.get("warehouseId")))
    if result.get("success") and isinstance(result.get("data"), list):
        result["data"] = [
            {**item, "pickOrderNumber": item.get("pickOrderNumber") or item.get("taskNumber")}
            for item in result["data"]
        ]
    return result


def get_pick_order_detail(session: WmsSession, pick_order_id: str) -> Dict[str, Any]:
    result = normalize_result(session.api_request("GET", f"/api/v1/pick-orders/{pick_order_id}", warehouse_id=session.warehouse_id))
    if result.get("success") and result.get("data", {}).get("taskNumber") and not result["data"].get("pickOrderNumber"):
        result["data"]["pickOrderNumber"] = result["data"]["taskNumber"]
    return result


def print_pick_order(session: WmsSession, pick_order_id: str) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", f"/api/v1/pick-orders/{pick_order_id}/print", data={}, warehouse_id=session.warehouse_id))


def packing_lookup(session: WmsSession, scan_code: str) -> Dict[str, Any]:
    return normalize_result(session.api_request(
        "GET",
        "/api/v1/packing/lookup",
        query={"scanCode": scan_code},
        warehouse_id=session.warehouse_id,
    ))


def start_packing(session: WmsSession, pick_order_id: str) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", f"/api/v1/packing/{pick_order_id}/start", data={}, warehouse_id=session.warehouse_id))


def scan_sku_for_packing(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    serial_numbers = data.get("serialNumbers")
    if serial_numbers is None:
        serial_numbers = []
    return normalize_result(session.api_request(
        "POST",
        f"/api/v1/packing/{data['pickOrderId']}/scan-sku",
        data={
            "orderId": data["orderId"],
            "barcode": data["skuCode"],
            "quantity": data["quantity"],
            "serialNumbers": serial_numbers,
        },
        warehouse_id=session.warehouse_id,
    ))


def complete_order_packing(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    materials = session.api_request(
        "GET",
        "/api/v1/packaging-materials",
        query={"pageSize": 1},
        warehouse_id=session.warehouse_id,
    )["body"]
    material_id = None
    if materials.get("success") and materials.get("data"):
        material_id = materials["data"][0]["id"]

    return normalize_result(session.api_request(
        "POST",
        f"/api/v1/packing/{data['pickOrderId']}/complete-order",
        data={
            "orderId": data["orderId"],
            "packagingMaterials": [{"materialId": material_id, "quantity": 1}] if material_id else [],
            "weight": data.get("weightKg", 1.2),
        },
        warehouse_id=session.warehouse_id,
    ))


def validate_checkout(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", "/api/v1/checkout/validate", data=data, warehouse_id=data.get("warehouseId")))


def scan_checkout(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", "/api/v1/checkout/scan", data=data, warehouse_id=session.warehouse_id))


def confirm_checkout(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", "/api/v1/checkout/confirm", data=data, warehouse_id=session.warehouse_id))


def get_checkout_order_detail(session: WmsSession, checkout_order_id: str) -> Dict[str, Any]:
    return normalize_result(session.api_request("GET", f"/api/v1/checkout/{checkout_order_id}", warehouse_id=session.warehouse_id))


def create_manifest_order(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", "/api/v1/manifest-orders", data=data, warehouse_id=data.get("warehouseId")))


def validate_manifest_mount(session: WmsSession, manifest_number: str) -> Dict[str, Any]:
    return normalize_result(session.api_request(
        "POST",
        "/api/v1/manifest-mount/validate",
        data={"manifestNumber": manifest_number},
        warehouse_id=session.warehouse_id,
    ))


def mount_checkout_to_manifest(session: WmsSession, data: Dict[str, Any]) -> Dict[str, Any]:
    return normalize_result(session.api_request("POST", "/api/v1/manifest-mount/scan", data=data, warehouse_id=session.warehouse_id))


def confirm_manifest_mount(session: WmsSession, manifest_order_id: str) -> Dict[str, Any]:
    return normalize_result(session.api_request(
        "POST",
        "/api/v1/manifest-mount/confirm",
        data={"manifestOrderId": manifest_order_id},
        warehouse_id=session.warehouse_id,
    ))


def get_manifest_order_detail(session: WmsSession, manifest_order_id: str) -> Dict[str, Any]:
    return normalize_result(session.api_request("GET", f"/api/v1/manifest-orders/{manifest_order_id}", warehouse_id=session.warehouse_id))
