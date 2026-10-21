from common import batch_allocate_inventory, get_outbound_order_detail, get_outbound_orders, wait_for_order_status

from ..context import MainFlowContext, add_warning


def execute(session, context: MainFlowContext) -> bool:
    if not context.order_id:
        raise RuntimeError("缺少待分配订单")

    context.allocate_result = batch_allocate_inventory(session, [context.order_id])
    if context.allocate_result.get("success"):
        detail = wait_for_order_status(session, context.order_id, "ALLOCATED", 15)
        if detail.get("success") and detail.get("data", {}).get("status") == "ALLOCATED":
            print(f"[INFO] 订单分配成功: {context.order_number}")
            return True

    detail = get_outbound_order_detail(session, context.order_id)
    allocated = get_outbound_orders(
        session,
        {
            "warehouseId": context.base_data["warehouse_id"],
            "clientId": context.base_data["client_id"],
            "status": "ALLOCATED",
            "pageSize": 10,
        },
    )
    add_warning(
        context,
        "订单分配不可用: "
        + " | ".join(
            [
                context.allocate_result.get("message", "批量库存分配失败"),
                f"订单状态: {detail.get('data', {}).get('status', 'UNKNOWN')}",
                f"当前环境已分配订单数: {len(allocated.get('data') or [])}",
            ]
        ),
    )
    return False
