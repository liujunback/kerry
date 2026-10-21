from common import create_pick_order, get_pick_order_detail, get_pick_orders

from ..context import MainFlowContext


def execute(session, context: MainFlowContext, allocated: bool) -> None:
    if allocated:
        pick = create_pick_order(
            session,
            {
                "warehouseId": context.base_data["warehouse_id"],
                "orderIds": [context.order_id],
                "priority": 3,
            },
        )
        if not pick.get("success"):
            raise RuntimeError(f"创建拣货单失败: {pick.get('message')}")
        context.pick_order_id = pick["data"]["id"]
        context.pick_order_number = pick["data"]["pickOrderNumber"]
        context.packing_lookup_code = context.pick_order_number
    else:
        existing = get_pick_orders(
            session,
            {
                "warehouseId": context.base_data["warehouse_id"],
                "status": "PENDING",
                "pageSize": 10,
            },
        )
        if not existing.get("success") or not existing.get("data"):
            raise RuntimeError("当前环境没有可复用的待处理拣货单")

        context.pick_order_id = existing["data"][0]["id"]
        context.pick_order_number = existing["data"][0]["pickOrderNumber"]

    detail = get_pick_order_detail(session, context.pick_order_id)
    if not detail.get("success") or not detail.get("data", {}).get("lines"):
        raise RuntimeError("拣货单详情不可用")

    context.order_id = detail["data"]["lines"][0]["order"]["id"]
    context.order_number = detail["data"]["lines"][0]["order"]["orderNumber"]
    if not allocated:
        context.packing_lookup_code = context.order_number
    context.packing_lines = [
        {"skuCode": line["skuCode"], "quantity": int(line.get("expectedQty") or 0)}
        for line in detail["data"]["lines"]
    ]
    print(f"[INFO] 拣货单: {context.pick_order_number}")
