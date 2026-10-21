package com.kec.wms.pda.data.model

/**
 * PDA 权限常量定义
 * 必须与后端返回的 permissionCode 保持一致。
 */
object Permission {
    // 入库管理
    const val ASN_SIGN_IN = "asn:sign-in"
    const val RECEIVING_EXECUTE = "receiving:execute"
    const val PUTAWAY_EXECUTE = "putaway:execute"
    const val SHELVING_EXECUTE = "shelving:execute"
    const val RETURN_SIGN_IN = "return:sign-in"
    const val RETURN_COUNT = "return:count"
    const val RETURN_PUTAWAY_EXECUTE = "return:putaway:execute"

    // 出库管理
    const val PICKING_EXECUTE = "picking:execute"
    const val PACKING_EXECUTE = "packing:execute"
    const val CHECKOUT_EXECUTE = "checkout:execute"
    const val SHIPPING_SHIP = "shipping:ship"
    const val MANIFEST_MOUNT_EXECUTE = "manifest-mount:execute"

    // 库存管理
    const val INVENTORY_COUNT = "inventory:count"
    const val INVENTORY_ADJUST = "inventory:adjust"
    const val INVENTORY_TRANSFER = "inventory:transfer"
    const val INVENTORY_READ = "inventory:read"
}
