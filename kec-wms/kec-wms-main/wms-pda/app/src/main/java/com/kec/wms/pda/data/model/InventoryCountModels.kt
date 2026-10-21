package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class InventoryCountBatchSummary(
    @SerializedName("orderId")
    val orderId: String,
    @SerializedName("orderNumber")
    val orderNumber: String,
    @SerializedName("orderName")
    val orderName: String,
    @SerializedName("orderType")
    val orderType: String = "",
    @SerializedName("orderStatus")
    val orderStatus: String = "",
    @SerializedName("batchId")
    val batchId: String,
    @SerializedName("batchNumber")
    val batchNumber: String,
    @SerializedName("batchType")
    val batchType: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("countMode")
    val countMode: String,
    @SerializedName("pdaMode")
    val pdaMode: String,
    @SerializedName("clientName")
    val clientName: String = "",
    @SerializedName("scopeSummary")
    val scopeSummary: String = "",
    @SerializedName("totalDetailCount")
    val totalDetailCount: Int = 0,
    @SerializedName("countedDetailCount")
    val countedDetailCount: Int = 0,
    @SerializedName("pendingDetailCount")
    val pendingDetailCount: Int = 0,
    @SerializedName("diffDetailCount")
    val diffDetailCount: Int = 0,
    @SerializedName("locationCount")
    val locationCount: Int = 0,
    @SerializedName("skuCount")
    val skuCount: Int = 0,
    @SerializedName("progressPercent")
    val progressPercent: Int = 0,
    @SerializedName("startedAt")
    val startedAt: String? = null,
    @SerializedName("completedAt")
    val completedAt: String? = null,
)

data class InventoryCountBatchDetailResponse(
    @SerializedName("batch")
    val batch: InventoryCountBatchSummary,
    @SerializedName("details")
    val details: List<InventoryCountDetail> = emptyList(),
)

data class InventoryCountDetail(
    @SerializedName("id")
    val id: String,
    @SerializedName("batchId")
    val batchId: String? = null,
    @SerializedName("detailNumber")
    val detailNumber: String,
    @SerializedName("clientName")
    val clientName: String = "",
    @SerializedName("locationId")
    val locationId: String = "",
    @SerializedName("locationCode")
    val locationCode: String,
    @SerializedName("skuId")
    val skuId: String = "",
    @SerializedName("skuCode")
    val skuCode: String,
    @SerializedName("skuName")
    val skuName: String = "",
    @SerializedName("barcode")
    val barcode: String = "",
    @SerializedName("batchNumber")
    val batchNumber: String = "",
    @SerializedName("lpn")
    val lpn: String = "",
    @SerializedName("bucketType")
    val bucketType: String,
    @SerializedName("bookQuantity")
    val bookQuantity: Int = 0,
    @SerializedName("finalQuantity")
    val finalQuantity: Int? = null,
    @SerializedName("diffQuantity")
    val diffQuantity: Int? = null,
    @SerializedName("status")
    val status: String,
    @SerializedName("expiryDate")
    val expiryDate: String? = null,
)

data class InventoryCountSubmitScope(
    @SerializedName("locationId")
    val locationId: String,
    @SerializedName("skuId")
    val skuId: String,
    @SerializedName("batchNumber")
    val batchNumber: String = "",
    @SerializedName("lpn")
    val lpn: String = "",
    @SerializedName("bucketType")
    val bucketType: String,
    @SerializedName("expiryDateKey")
    val expiryDateKey: String,
)

data class SubmitInventoryCountLineRequest(
    @SerializedName("countedQuantity")
    val countedQuantity: Int,
    @SerializedName("isEmptyLocation")
    val isEmptyLocation: Boolean = false,
    @SerializedName("exceptionReasonCode")
    val exceptionReasonCode: String? = null,
    @SerializedName("remark")
    val remark: String? = null,
    @SerializedName("scanPayload")
    val scanPayload: Map<String, String>? = null,
    @SerializedName("scope")
    val scope: InventoryCountSubmitScope? = null,
    @SerializedName("roundType")
    val roundType: String? = null,
)
