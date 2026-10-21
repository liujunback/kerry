from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class MainFlowContext:
    base_data: Dict[str, str] = field(default_factory=dict)
    unique_tag: str = ""
    sku_source: str = ""
    created_sku_id: str = ""
    created_sku_code: str = ""
    asn_id: str = ""
    asn_number: str = ""
    asn_line_id: str = ""
    receive_record_number: str = ""
    putaway_order_id: str = ""
    putaway_location_code: str = ""
    inventory_prepare_status: str = ""
    order_id: str = ""
    order_number: str = ""
    pick_order_id: str = ""
    pick_order_number: str = ""
    packing_lookup_code: str = ""
    packing_lines: List[Dict[str, int]] = field(default_factory=list)
    checkout_order_id: str = ""
    checkout_number: str = ""
    checkout_channel_code: str = ""
    checkout_channel_name: str = ""
    manifest_order_id: str = ""
    manifest_number: str = ""
    prep_result: Dict = field(default_factory=dict)
    allocate_result: Dict = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)


def add_warning(context: MainFlowContext, message: str) -> None:
    context.warnings.append(message)
    print(f"[WARN] {message}")
