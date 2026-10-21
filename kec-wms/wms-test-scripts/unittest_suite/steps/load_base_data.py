from common import create_test_sku, resolve_base_data

from ..context import MainFlowContext


def execute(session, context: MainFlowContext) -> None:
    context.base_data = resolve_base_data(session)
    auto_create_sku = str(session.config.get("auto_create_sku", "true")).lower() == "true"
    if auto_create_sku:
        created = create_test_sku(session, context.base_data, context.unique_tag)
        if not created.get("success"):
            raise RuntimeError(f"自动创建 SKU 失败: {created.get('message')}")
        context.base_data["sku_id"] = created["data"]["id"]
        context.base_data["sku_code"] = created["data"]["skuCode"]
        context.created_sku_id = created["data"]["id"]
        context.created_sku_code = created["data"]["skuCode"]
        context.sku_source = "AUTO_CREATED"
    else:
        context.sku_source = "EXISTING"
        context.created_sku_id = context.base_data.get("sku_id", "")
        context.created_sku_code = context.base_data.get("sku_code", "")
    print(
        f"[INFO] 基础主数据: "
        f"{context.base_data['warehouse_code']} / "
        f"{context.base_data['client_code']} / "
        f"{context.base_data['sku_code']}"
    )
