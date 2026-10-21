from common import create_outbound_order

from ..context import MainFlowContext


def execute(session, context: MainFlowContext, reference_number: str, quantity: int = 2) -> None:
    result = create_outbound_order(
        session,
        {
            "clientId": context.base_data["client_id"],
            "warehouseId": context.base_data["warehouse_id"],
            "referenceNumber": reference_number,
            "orderType": "STANDARD",
            "businessType": "STANDARD",
            "priority": "NORMAL",
            "address": {
                "contactName": "unittest-flow",
                "addressLine": "test address",
                "city": "Shanghai",
                "province": "Shanghai",
                "country": "CN",
                "postalCode": "200000",
            },
            "lines": [
                {
                    "skuId": context.base_data["sku_id"],
                    "skuCode": context.base_data["sku_code"],
                    "orderedQty": quantity,
                }
            ],
        },
    )
    if not result.get("success"):
        raise RuntimeError(f"创建出库订单失败: {result.get('message')}")

    context.order_id = result["data"]["id"]
    context.order_number = result["data"]["orderNumber"]
    print(f"[INFO] 已创建订单: {context.order_number}")
