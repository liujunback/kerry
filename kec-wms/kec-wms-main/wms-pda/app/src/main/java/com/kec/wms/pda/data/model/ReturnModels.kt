package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class ReturnLookupRequest(
    @SerializedName("logisticsNo")
    val logisticsNo: String,
)

data class ReturnSignInConfirmRequest(
    @SerializedName("logisticsNo")
    val logisticsNo: String,

    @SerializedName("returnOrderId")
    val returnOrderId: String? = null,

    @SerializedName("outboundOrderId")
    val outboundOrderId: String? = null,
)

data class ReturnSignInLookupResult(
    @SerializedName("matchType")
    val matchType: String,

    @SerializedName("returnOrder")
    val returnOrder: ReturnOrder? = null,

    @SerializedName("outboundOrder")
    val outboundOrder: ReturnOutboundOrder? = null,
)

data class ReturnOrder(
    @SerializedName("id")
    val id: String,

    @SerializedName("returnNo")
    val returnNo: String,

    @SerializedName("returnType")
    val returnType: String? = null,

    @SerializedName("preReturnNo")
    val preReturnNo: String? = null,

    @SerializedName("logisticsNo")
    val logisticsNo: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("warehouseId")
    val warehouseId: String? = null,

    @SerializedName("warehouse")
    val warehouse: WarehouseInfo? = null,

    @SerializedName("totalExpectedQty")
    val totalExpectedQty: Int = 0,

    @SerializedName("totalCountedQty")
    val totalCountedQty: Int = 0,

    @SerializedName("totalPutawayQty")
    val totalPutawayQty: Int = 0,

    @SerializedName("totalLineCount")
    val totalLineCount: Int = 0,

    @SerializedName("client")
    val client: ReturnClient? = null,

    @SerializedName("lines")
    val lines: List<ReturnOrderLine> = emptyList(),
)

data class ReturnOutboundOrder(
    @SerializedName("id")
    val id: String,

    @SerializedName("orderNumber")
    val orderNumber: String,

    @SerializedName("platformOrderId")
    val platformOrderId: String? = null,

    @SerializedName("referenceNumber")
    val referenceNumber: String? = null,

    @SerializedName("trackingNumber")
    val trackingNumber: String? = null,

    @SerializedName("warehouseId")
    val warehouseId: String? = null,

    @SerializedName("warehouse")
    val warehouse: WarehouseInfo? = null,

    @SerializedName("client")
    val client: ReturnClient? = null,

    @SerializedName("lines")
    val lines: List<ReturnOutboundLine> = emptyList(),
)

data class ReturnOutboundLine(
    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String? = null,

    @SerializedName("orderedQty")
    val orderedQty: Int = 0,
)

data class ReturnClient(
    @SerializedName("clientCode")
    val clientCode: String? = null,

    @SerializedName("clientName")
    val clientName: String? = null,
)

data class ReturnOrderLine(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("returnLineNo")
    val returnLineNo: String? = null,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String? = null,

    @SerializedName("barcode")
    val barcode: String? = null,

    @SerializedName("expectedQty")
    val expectedQty: Int = 0,

    @SerializedName("countedQty")
    val countedQty: Int = 0,

    @SerializedName("putawayQty")
    val putawayQty: Int = 0,

    @SerializedName("quality")
    val quality: String? = null,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("containerCode")
    val containerCode: String? = null,

    @SerializedName("tempLocationCode")
    val tempLocationCode: String? = null,

    @SerializedName("photoUrls")
    val photoUrls: List<String> = emptyList(),

    @SerializedName("status")
    val status: String? = null,
)

data class ReturnCountLineRequest(
    @SerializedName("barcode")
    val barcode: String,

    @SerializedName("countedQty")
    val countedQty: Int,

    @SerializedName("quality")
    val quality: String,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("containerCode")
    val containerCode: String,

    @SerializedName("tempLocationCode")
    val tempLocationCode: String,

    @SerializedName("photoUrls")
    val photoUrls: List<String> = emptyList(),

    @SerializedName("notes")
    val notes: String? = null,
)

data class ReturnPhotoUploadResult(
    @SerializedName("url")
    val url: String,
)

data class ReturnPutawayOrder(
    @SerializedName("id")
    val id: String,

    @SerializedName("putawayOrderNumber")
    val putawayOrderNumber: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("totalQty")
    val totalQty: Int,

    @SerializedName("putawayQty")
    val putawayQty: Int,

    @SerializedName("pendingQty")
    val pendingQty: Int,

    @SerializedName("warehouseId")
    val warehouseId: String? = null,

    @SerializedName("warehouse")
    val warehouse: WarehouseInfo? = null,

    @SerializedName("returnOrder")
    val returnOrder: ReturnPutawayReturnOrder,

    @SerializedName("client")
    val client: ReturnClient? = null,

    @SerializedName("lines")
    val lines: List<ReturnPutawayLine> = emptyList(),
)

data class ReturnPutawayReturnOrder(
    @SerializedName("returnNo")
    val returnNo: String,

    @SerializedName("logisticsNo")
    val logisticsNo: String,

    @SerializedName("warehouse")
    val warehouse: WarehouseInfo? = null,
)

data class ReturnPutawayLine(
    @SerializedName("id")
    val id: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String? = null,

    @SerializedName("barcode")
    val barcode: String? = null,

    @SerializedName("quality")
    val quality: String,

    @SerializedName("action")
    val action: String,

    @SerializedName("quantity")
    val quantity: Int = 0,

    @SerializedName("putawayQty")
    val putawayQty: Int = 0,

    @SerializedName("remainingQty")
    val remainingQty: Int,

    @SerializedName("containerCode")
    val containerCode: String? = null,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("status")
    val status: String,
)

data class ReturnPutawayExecuteRequest(
    @SerializedName("putawayOrderNumber")
    val putawayOrderNumber: String,

    @SerializedName("containerCode")
    val containerCode: String,

    @SerializedName("logisticsNo")
    val logisticsNo: String,

    @SerializedName("barcode")
    val barcode: String,

    @SerializedName("quality")
    val quality: String,

    @SerializedName("quantity")
    val quantity: Int,

    @SerializedName("targetLocationCode")
    val targetLocationCode: String,

    @SerializedName("deviceType")
    val deviceType: String = "PDA",
)

data class ReturnPutawayExecuteResult(
    @SerializedName("eventId")
    val eventId: String? = null,

    @SerializedName("warehouseId")
    val warehouseId: String? = null,

    @SerializedName("warehouse")
    val warehouse: WarehouseInfo? = null,

    @SerializedName("skuCode")
    val skuCode: String? = null,
)
