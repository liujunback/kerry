from common import complete_order_packing, packing_lookup, print_pick_order, scan_sku_for_packing, start_packing

from ..context import MainFlowContext, add_warning


def execute(session, context: MainFlowContext) -> None:
    printed = print_pick_order(session, context.pick_order_id)
    if not printed.get("success"):
        raise RuntimeError(f"下发拣货单失败: {printed.get('message')}")

    lookup = packing_lookup(session, context.packing_lookup_code)
    if not lookup.get("success"):
        add_warning(context, f"打包查询未通过，继续尝试直接打包: {lookup.get('message')}")
        lookup_lines = []
    else:
        order_info = lookup.get("data", {}).get("orderInfo", {})
        lookup_lines = order_info.get("lines") or []

    started = start_packing(session, context.pick_order_id)
    if not started.get("success"):
        raise RuntimeError(f"开始打包失败: {started.get('message')}")

    lines_to_pack = []
    if lookup_lines:
        for line in lookup_lines:
            remain_qty = int(line.get("expectedQty") or 0) - int(line.get("packedQty") or 0)
            if remain_qty > 0:
                lines_to_pack.append({"skuCode": line["skuCode"], "quantity": remain_qty})
    else:
        lines_to_pack = context.packing_lines

    packed_any = False
    for line in lines_to_pack:
        scanned = scan_sku_for_packing(
            session,
            {
                "pickOrderId": context.pick_order_id,
                "orderId": context.order_id,
                "skuCode": line["skuCode"],
                "quantity": line["quantity"],
            },
        )
        if not scanned.get("success"):
            message = scanned.get("message") or ""
            if "已全部打包完成" in message:
                add_warning(context, f"SKU {line['skuCode']} 已打包完成，跳过重复扫描")
                continue
            raise RuntimeError(f"扫描打包失败: {line['skuCode']} / {message}")
        packed_any = True

    if not packed_any:
        raise RuntimeError("当前订单没有可继续打包的 SKU，无法推进后续签出流程")

    completed = complete_order_packing(
        session,
        {
            "pickOrderId": context.pick_order_id,
            "orderId": context.order_id,
            "weightKg": 1.2,
        },
    )
    if not completed.get("success"):
        raise RuntimeError(f"完成打包失败: {completed.get('message')}")
