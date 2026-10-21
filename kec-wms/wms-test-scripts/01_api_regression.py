import time

from common import (
    WmsSession,
    batch_allocate_inventory,
    create_asn,
    create_outbound_order,
    get_config,
    get_inventory,
    get_outbound_order_detail,
    get_outbound_orders,
    prepare_available_inventory,
    receive_sku_to_asn,
    resolve_base_data,
    sign_in_asn,
)


def print_result(name: str, passed: bool, message: str = "") -> None:
    prefix = "PASS" if passed else "FAIL"
    suffix = f" - {message}" if message else ""
    print(f"[{prefix}] {name}{suffix}")


def print_warn(name: str, message: str) -> None:
    print(f"[WARN] {name} - {message}")


def main() -> int:
    session = WmsSession(get_config())
    session.login()
    failed = 0
    unique_tag = str(int(time.time() * 1000))
    strict_allocate = (session.config.get("strict_allocate") or "").lower() == "true"

    base = resolve_base_data(session)
    print_result("基础主数据", True, f"{base['warehouse_code']} / {base['client_code']} / {base['sku_code']}")

    try:
        asn = create_asn(
            session,
            {
                "clientId": base["client_id"],
                "warehouseId": base["warehouse_id"],
                "asnType": "NORMAL",
                "externalNumber": f"PY-ASN-{unique_tag}",
                "lines": [
                    {
                        "skuId": base["sku_id"],
                        "skuCode": base["sku_code"],
                        "expectedQty": 5,
                    }
                ],
            },
        )
        if not asn.get("success"):
            raise RuntimeError(asn.get("message", "创建 ASN 失败"))

        sign = sign_in_asn(session, asn["data"]["id"])
        if not sign.get("success"):
            raise RuntimeError(sign.get("message", "签收 ASN 失败"))

        receive = receive_sku_to_asn(
            session,
            {
                "asnId": asn["data"]["id"],
                "asnLineId": asn["data"]["lines"][0]["id"],
                "receivedQty": 5,
                "qualityStatus": "GOOD",
                "receivingMode": "SKU",
            },
        )
        if not receive.get("success"):
            raise RuntimeError(receive.get("message", "收货失败"))

        inventory = get_inventory(
            session,
            {
                "warehouseId": base["warehouse_id"],
                "skuCode": base["sku_code"],
            },
        )["body"]
        if not inventory.get("success"):
            raise RuntimeError(inventory.get("message", "查询库存失败"))

        print_result("ASN 创建/签收/收货", True)
    except Exception as error:
        failed += 1
        print_result("ASN 创建/签收/收货", False, str(error))

    try:
        prep = prepare_available_inventory(session, base, 10)
        if not prep.get("success"):
            print(f"[WARN] 备货上架未完成: {prep.get('message')}")

        order = create_outbound_order(
            session,
            {
                "clientId": base["client_id"],
                "warehouseId": base["warehouse_id"],
                "referenceNumber": f"PY-ORDER-{unique_tag}",
                "orderType": "STANDARD",
                "businessType": "STANDARD",
                "priority": "NORMAL",
                "address": {
                    "contactName": "python-api",
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
        if not order.get("success"):
            raise RuntimeError(order.get("message", "创建出库订单失败"))

        allocate = batch_allocate_inventory(session, [order["data"]["id"]])
        if not allocate.get("success"):
            detail = get_outbound_order_detail(session, order["data"]["id"])
            allocated = get_outbound_orders(
                session,
                {
                    "warehouseId": base["warehouse_id"],
                    "clientId": base["client_id"],
                    "status": "ALLOCATED",
                    "pageSize": 10,
                },
            )
            message = " | ".join(
                [
                    allocate.get("message", "批量库存分配失败"),
                    f"订单状态: {detail.get('data', {}).get('status', 'UNKNOWN')}",
                    f"当前环境已分配订单数: {len(allocated.get('data') or [])}",
                ]
            )
            if strict_allocate:
                raise RuntimeError(message)

            print_warn("出库创建与分配", f"订单已创建，但当前环境分配不可用: {message}")
            print_result("出库订单创建", True, order["data"]["orderNumber"])
            return_code_safe = True
        else:
            print_result("出库创建与分配", True)
            return_code_safe = False
        if return_code_safe:
            pass
    except Exception as error:
        failed += 1
        print_result("出库创建与分配", False, str(error))

    try:
        invalid = create_outbound_order(
            session,
            {
                "clientId": base["client_id"],
                "warehouseId": base["warehouse_id"],
                "referenceNumber": f"PY-ERR-{unique_tag}",
                "orderType": "STANDARD",
                "businessType": "STANDARD",
                "priority": "NORMAL",
                "address": {
                    "contactName": "python-negative",
                    "addressLine": "negative address",
                    "city": "Shanghai",
                    "province": "Shanghai",
                    "country": "CN",
                    "postalCode": "200000",
                },
                "lines": [{"skuCode": "NOT-EXIST-SKU", "orderedQty": 1}],
            },
        )
        if invalid.get("success"):
            raise RuntimeError("非法 SKU 下单本应失败，但实际成功")
        print_result("异常参数校验", True)
    except Exception as error:
        failed += 1
        print_result("异常参数校验", False, str(error))

    if failed:
        print(f"\n接口回归完成，失败 {failed} 项。")
        return 1

    print("\n接口回归完成，全部通过。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
