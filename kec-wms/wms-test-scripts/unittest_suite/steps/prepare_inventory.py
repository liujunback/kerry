from common import prepare_available_inventory

from ..context import MainFlowContext, add_warning


def execute(session, context: MainFlowContext, quantity: int = 10) -> None:
    context.prep_result = prepare_available_inventory(session, context.base_data, quantity)
    if context.prep_result.get("success"):
        prep_data = context.prep_result.get("data", {})
        asn_data = prep_data.get("asn", {}).get("data", {})
        receive_data = prep_data.get("receive", {}).get("data", {})
        location_data = prep_data.get("location", {})

        context.asn_id = asn_data.get("id", "")
        context.asn_number = asn_data.get("asnNumber", "")
        lines = asn_data.get("lines") or []
        if lines:
            context.asn_line_id = lines[0].get("id", "")
        receiving_record = receive_data.get("receivingRecord") or {}
        context.receive_record_number = receiving_record.get("recordNumber", "")
        context.putaway_order_id = prep_data.get("putaway_order_id", "")
        context.putaway_location_code = location_data.get("locationCode", "")
        context.inventory_prepare_status = "SUCCESS"
    else:
        context.inventory_prepare_status = "FAILED"
        add_warning(
            context,
            f"备货未完成，将尝试复用现有单据: {context.prep_result.get('message')}",
        )
