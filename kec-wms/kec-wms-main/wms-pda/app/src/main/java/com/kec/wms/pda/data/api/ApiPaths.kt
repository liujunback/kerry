package com.kec.wms.pda.data.api

object ApiPaths {
    object Auth {
        const val LOGIN = "api/v1/auth/login"
        const val CURRENT_USER = "api/v1/auth/me"
        const val PDA_TOKEN_LOGIN = "api/v1/auth/pda-token-login"
    }

    object AppUpdate {
        const val APP_VERSION = "api/v1/pda/app-version"
    }

    object Inbound {
        const val ASN_SIGN_IN = "api/pda/v1/inbound/asn/sign-in"
        const val ASN_LOOKUP = "api/pda/v1/inbound/asn/lookup"
        const val ASN_RECEIVING_SKU = "api/pda/v1/inbound/asn/{id}/receiving/sku"
        const val ASN_RECEIVING_COMPLETE = "api/pda/v1/inbound/asn/{id}/receiving/complete"
        const val ASN_RECEIVING_LOOKUP_SKU = "api/pda/v1/inbound/asn/{id}/receiving/lookup-sku"
        const val PUTAWAY_ORDER_DETAIL = "api/pda/v1/inbound/shelving/putaway-order"
        const val PUTAWAY_CONTAINER = "api/pda/v1/inbound/shelving/container"
        const val PUTAWAY_LOCATION = "api/pda/v1/inbound/shelving/location"
        const val PUTAWAY_SUBMIT = "api/pda/v1/inbound/shelving"
    }

    object Container {
        const val LOOKUP = "api/pda/v1/containers/lookup"
        const val ITEMS = "api/pda/v1/containers/{id}/items"
        const val RESET = "api/pda/v1/containers/{id}/reset"
        const val CLOSE = "api/pda/v1/containers/{id}/close"
    }

    object Sku {
        const val CAPTURE_DIMENSIONS = "api/pda/v1/sku/{id}/capture-dimensions"
    }

    object Inventory {
        const val ADJUSTMENT_LOOKUP = "api/pda/v1/inventory/adjustments/lookup"
        const val ADJUSTMENT_SUBMIT = "api/pda/v1/inventory/adjustments/submit"
        const val QUERY = "api/pda/v1/inventory/query"
        const val COUNT_BATCHES = "api/pda/v1/inventory/counts"
        const val COUNT_BATCH_DETAIL = "api/pda/v1/inventory/counts/{orderId}/batches/{batchId}"
        const val COUNT_BATCH_START = "api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/start"
        const val COUNT_BATCH_COMPLETE = "api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/complete"
        const val COUNT_LINE_SUBMIT = "api/pda/v1/inventory/counts/{orderId}/batches/{batchId}/lines/{detailId}/submit"
        const val COUNT_SCOPE_SUBMIT = "api/pda/v1/inventory/counts/{orderId}/lines/submit"
    }

    object Returns {
        const val SIGN_IN_LOOKUP = "api/pda/v1/returns/sign-in/lookup"
        const val SIGN_IN_CONFIRM = "api/pda/v1/returns/sign-in/confirm"
        const val COUNTING_LOOKUP = "api/pda/v1/returns/counting/lookup"
        const val COUNT_LINE_SUBMIT = "api/pda/v1/returns/{id}/count-lines"
        const val COUNTING_COMPLETE = "api/pda/v1/returns/{id}/complete-counting"
        const val PHOTO_UPLOAD = "api/pda/v1/returns/photos"
        const val PUTAWAY_ORDERS = "api/pda/v1/returns/putaway/orders"
        const val PUTAWAY_EXECUTE = "api/pda/v1/returns/putaway/execute"
    }

    object Outbound {
        const val CHECKOUT_VALIDATE = "api/pda/v1/outbound/checkout/validate"
        const val CHECKOUT_SCAN = "api/pda/v1/outbound/checkout/scan"
        const val CHECKOUT_CONFIRM = "api/pda/v1/outbound/checkout/confirm"
        const val CHECKOUT_PENDING = "api/pda/v1/outbound/checkout/pending"
        const val PICKING_TASKS = "api/pda/v1/outbound/picking/tasks"
        const val PICKING_TASK_DETAIL = "api/pda/v1/outbound/picking/tasks/{id}"
        const val PICKING_BIND_CONTAINER = "api/pda/v1/outbound/picking/tasks/{id}/bind-container"
        const val PICKING_SUBMIT_LINE = "api/pda/v1/outbound/picking/tasks/{id}/lines/{lineId}/pick"
        const val PICKING_COMPLETE = "api/pda/v1/outbound/picking/tasks/{id}/complete"
        const val MANIFEST_MOUNT_VALIDATE = "api/pda/v1/outbound/manifest-mount/validate"
        const val MANIFEST_MOUNT_SCAN = "api/pda/v1/outbound/manifest-mount/scan"
        const val MANIFEST_MOUNT_CONFIRM = "api/pda/v1/outbound/manifest-mount/confirm"
    }
}
