import time

from common import (
    WmsSession,
    batch_allocate_inventory,
    confirm_checkout,
    confirm_manifest_mount,
    create_manifest_order,
    create_outbound_order,
    create_pick_order,
    get_checkout_order_detail,
    get_config,
    get_manifest_order_detail,
    get_outbound_orders,
    get_pick_order_detail,
    get_pick_orders,
    mount_checkout_to_manifest,
    packing_lookup,
    prepare_available_inventory,
    print_pick_order,
    resolve_base_data,
    scan_checkout,
    scan_sku_for_packing,
    start_packing,
    validate_checkout,
    validate_manifest_mount,
    wait_for_order_status,
    complete_order_packing,
)


def main() -> int:
    session = WmsSession(get_config())
    session.login()
    base = resolve_base_data(session)
    unique_tag = str(int(time.time() * 1000))

    order_id = ""
    order_number = ""
    pick_order_id = ""
    pick_order_number = ""
    packing_lookup_code = ""
    packing_lines = []

    prep = prepare_available_inventory(session, base, 10)
    if not prep.get("success"):
        print(f"[WARN] 备货未完成，将尝试复用现有单据: {prep.get('message')}")

    order = create_outbound_order(
        session,
        {
            "clientId": base["client_id"],
            "warehouseId": base["warehouse_id"],
            "referenceNumber": f"PY-FLOW-{unique_tag}",
            "orderType": "STANDARD",
            "businessType": "STANDARD",
            "priority": "NORMAL",
            "address": {
                "contactName": "python-flow",
                "addressLine": "test address",
                "city": "Shanghai",
                "province": "Shanghai",
                "country": "CN",
                "postalCode": "200000",
            },
            "lines": [
                {
                    "skuId": base["sku_id"],
                    "skuCode": base["sku_code"],
                    "orderedQty": 2,
                }
            ],
        },
    )
    if order.get("success"):
        order_id = order["data"]["id"]
        order_number = order["data"]["orderNumber"]

    allocated = False
    if order_id:
        alloc = batch_allocate_inventory(session, [order_id])
        if alloc.get("success"):
            detail = wait_for_order_status(session, order_id, "ALLOCATED", 15)
            allocated = detail.get("success") and detail.get("data", {}).get("status") == "ALLOCATED"
        else:
            print(f"[WARN] 当前环境订单分配失败: {alloc.get('message')}")

    if allocated:
        pick = create_pick_order(
            session,
            {
                "warehouseId": base["warehouse_id"],
                "orderIds": [order_id],
                "priority": "HIGH",
            },
        )
        if not pick.get("success"):
            raise RuntimeError(f"创建拣货单失败: {pick.get('message')}")
        pick_order_id = pick["data"]["id"]
        pick_order_number = pick["data"]["pickOrderNumber"]
        packing_lookup_code = pick_order_number
        detail = get_pick_order_detail(session, pick_order_id)
        if not detail.get("success"):
            raise RuntimeError(f"查询拣货单失败: {detail.get('message')}")
        packing_lines = [
            {"skuCode": line["skuCode"], "quantity": int(line.get("expectedQty") or 0)}
            for line in detail["data"]["lines"]
        ]
    else:
        existing = get_pick_orders(
            session,
            {
                "warehouseId": base["warehouse_id"],
                "status": "PENDING",
                "pageSize": 10,
            },
        )
        if not existing.get("success") or not existing.get("data"):
            raise RuntimeError("当前环境没有可复用的待处理拣货单")
        pick_order_id = existing["data"][0]["id"]
        pick_order_number = existing["data"][0]["pickOrderNumber"]
        detail = get_pick_order_detail(session, pick_order_id)
        if not detail.get("success") or not detail.get("data", {}).get("lines"):
            raise RuntimeError("当前环境拣货单详情不可用")
        order_id = detail["data"]["lines"][0]["order"]["id"]
        order_number = detail["data"]["lines"][0]["order"]["orderNumber"]
        packing_lookup_code = order_number
        packing_lines = [
            {"skuCode": line["skuCode"], "quantity": int(line.get("expectedQty") or 0)}
            for line in detail["data"]["lines"]
        ]

    printed = print_pick_order(session, pick_order_id)
    if not printed.get("success"):
        raise RuntimeError(f"下发拣货单失败: {printed.get('message')}")

    lookup = packing_lookup(session, packing_lookup_code)
    if not lookup.get("success"):
        print(f"[WARN] 打包查询未通过，继续尝试直接打包: {lookup.get('message')}")

    start = start_packing(session, pick_order_id)
    if not start.get("success"):
        raise RuntimeError(f"开始打包失败: {start.get('message')}")

    for line in packing_lines:
        result = scan_sku_for_packing(
            session,
            {
                "pickOrderId": pick_order_id,
                "orderId": order_id,
                "skuCode": line["skuCode"],
                "quantity": line["quantity"],
            },
        )
        if not result.get("success"):
            raise RuntimeError(f"扫描打包失败: {line['skuCode']} / {result.get('message')}")

    completed = complete_order_packing(
        session,
        {
            "pickOrderId": pick_order_id,
            "orderId": order_id,
            "weightKg": 1.2,
        },
    )
    if not completed.get("success"):
        raise RuntimeError(f"完成打包失败: {completed.get('message')}")

    checkout = validate_checkout(
        session,
        {
            "containerNumber": f"PY-BAG-{int(time.time() * 1000)}",
            "checkoutType": "BAG",
            "warehouseId": base["warehouse_id"],
        },
    )
    if not checkout.get("success"):
        raise RuntimeError(f"创建签出单失败: {checkout.get('message')}")

    scanned = scan_checkout(
        session,
        {
            "checkoutOrderId": checkout["data"]["id"],
            "scannedNumber": order_number,
            "checkoutType": "BAG",
        },
    )
    if not scanned.get("success"):
        raise RuntimeError(f"签出扫描失败: {scanned.get('message')}")

    confirmed = confirm_checkout(
        session,
        {
            "checkoutOrderId": checkout["data"]["id"],
            "checkoutType": "BAG",
            "createMode": "PRE_CREATE",
            "records": [
                {
                    "scannedNumber": order_number,
                    "orderNumber": order_number,
                    "orderId": order_id,
                }
            ],
        },
    )
    if not confirmed.get("success"):
        raise RuntimeError(f"确认签出失败: {confirmed.get('message')}")

    checkout_detail = get_checkout_order_detail(session, checkout["data"]["id"])
    if not checkout_detail.get("success") or not checkout_detail.get("data", {}).get("checkoutNumber"):
        raise RuntimeError("查询签出单详情失败")

    manifest = create_manifest_order(
        session,
        {
            "warehouseId": base["warehouse_id"],
            "channelCode": f"PY-CH-{unique_tag[-6:]}",
            "channelName": f"Python Main Flow {unique_tag[-6:]}",
            "notes": f"External python main flow {unique_tag}",
        },
    )
    if not manifest.get("success"):
        raise RuntimeError(f"创建集运单失败: {manifest.get('message')}")

    validated = validate_manifest_mount(session, manifest["data"]["manifestNumber"])
    if not validated.get("success"):
        raise RuntimeError(f"校验集运单失败: {validated.get('message')}")

    mounted = mount_checkout_to_manifest(
        session,
        {
            "manifestOrderId": manifest["data"]["id"],
            "checkoutNumber": checkout_detail["data"]["checkoutNumber"],
        },
    )
    if not mounted.get("success"):
        raise RuntimeError(f"挂载签出单失败: {mounted.get('message')}")

    manifest_confirmed = confirm_manifest_mount(session, manifest["data"]["id"])
    if not manifest_confirmed.get("success"):
        raise RuntimeError(f"确认集运失败: {manifest_confirmed.get('message')}")

    manifest_detail = get_manifest_order_detail(session, manifest["data"]["id"])
    if not manifest_detail.get("success"):
        raise RuntimeError("查询集运单详情失败")

    print("主流程执行完成。")
    print(f"订单号: {order_number}")
    print(f"拣货单号: {pick_order_number}")
    print(f"签出单号: {checkout_detail['data']['checkoutNumber']}")
    print(f"集运单号: {manifest['data']['manifestNumber']}")
    print(f"集运状态: {manifest_detail['data']['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
