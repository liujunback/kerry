from common import create_outbound_order

from ..context import MainFlowContext


def execute(session, context: MainFlowContext) -> None:
    result = create_outbound_order(
        session,
        {
            "clientId": context.base_data["client_id"],
            "warehouseId": context.base_data["warehouse_id"],
            "referenceNumber": f"PY-ERR-{context.unique_tag}",
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
    if result.get("success"):
        raise RuntimeError("非法 SKU 下单本应失败，但实际成功")
