import time

from common import confirm_checkout, get_checkout_order_detail, scan_checkout, validate_checkout

from ..context import MainFlowContext


def execute(session, context: MainFlowContext) -> None:
    checkout = validate_checkout(
        session,
        {
            "containerNumber": f"PY-BAG-{int(time.time() * 1000)}",
            "checkoutType": "BAG",
            "warehouseId": context.base_data["warehouse_id"],
        },
    )
    if not checkout.get("success"):
        raise RuntimeError(f"创建签出单失败: {checkout.get('message')}")

    context.checkout_order_id = checkout["data"]["id"]

    scanned = scan_checkout(
        session,
        {
            "checkoutOrderId": context.checkout_order_id,
            "scannedNumber": context.order_number,
            "checkoutType": "BAG",
        },
    )
    if not scanned.get("success"):
        raise RuntimeError(f"签出扫描失败: {scanned.get('message')}")

    confirmed = confirm_checkout(
        session,
        {
            "checkoutOrderId": context.checkout_order_id,
            "checkoutType": "BAG",
            "createMode": "PRE_CREATE",
            "records": [
                {
                    "scannedNumber": context.order_number,
                    "orderNumber": context.order_number,
                    "orderId": context.order_id,
                }
            ],
        },
    )
    if not confirmed.get("success"):
        raise RuntimeError(f"确认签出失败: {confirmed.get('message')}")

    detail = get_checkout_order_detail(session, context.checkout_order_id)
    if not detail.get("success") or not detail.get("data", {}).get("checkoutNumber"):
        raise RuntimeError("查询签出单详情失败")

    context.checkout_number = detail["data"]["checkoutNumber"]
    context.checkout_channel_code = detail["data"].get("channelCode") or ""
    context.checkout_channel_name = detail["data"].get("channelName") or ""
    print(f"[INFO] 签出单: {context.checkout_number}")
