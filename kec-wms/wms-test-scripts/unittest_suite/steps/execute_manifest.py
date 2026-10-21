from common import (
    confirm_manifest_mount,
    create_manifest_order,
    get_manifest_order_detail,
    mount_checkout_to_manifest,
    validate_manifest_mount,
)

from ..context import MainFlowContext


def execute(session, context: MainFlowContext) -> None:
    channel_code = context.checkout_channel_code or f"PY-CH-{context.unique_tag[-6:]}"
    channel_name = context.checkout_channel_name or f"Python Main Flow {context.unique_tag[-6:]}"

    manifest = create_manifest_order(
        session,
        {
            "warehouseId": context.base_data["warehouse_id"],
            "channelCode": channel_code,
            "channelName": channel_name,
            "notes": f"External python main flow {context.unique_tag}",
        },
    )
    if not manifest.get("success"):
        raise RuntimeError(f"创建集运单失败: {manifest.get('message')}")

    context.manifest_order_id = manifest["data"]["id"]
    context.manifest_number = manifest["data"]["manifestNumber"]

    validated = validate_manifest_mount(session, context.manifest_number)
    if not validated.get("success"):
        raise RuntimeError(f"校验集运单失败: {validated.get('message')}")

    mounted = mount_checkout_to_manifest(
        session,
        {
            "manifestOrderId": context.manifest_order_id,
            "checkoutNumber": context.checkout_number,
        },
    )
    if not mounted.get("success"):
        raise RuntimeError(f"挂载签出单失败: {mounted.get('message')}")

    confirmed = confirm_manifest_mount(session, context.manifest_order_id)
    if not confirmed.get("success"):
        raise RuntimeError(f"确认集运失败: {confirmed.get('message')}")

    detail = get_manifest_order_detail(session, context.manifest_order_id)
    if not detail.get("success"):
        raise RuntimeError("查询集运单详情失败")
    print(f"[INFO] 集运单: {context.manifest_number} / {detail['data']['status']}")
