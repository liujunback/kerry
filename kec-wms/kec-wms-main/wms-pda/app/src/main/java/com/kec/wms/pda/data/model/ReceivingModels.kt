package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

/**
 * 收货请求模型
 * 对应后端 POST /api/v1/asn/[id]/receiving/sku 接口的请求体
 */
data class ReceivingRequest(
    @SerializedName("asnLineId")
    val asnLineId: String,

    @SerializedName("receivedQty")
    val receivedQty: Int,

    @SerializedName("qualityStatus")
    val qualityStatus: String, // "GOOD" or "DAMAGED"

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("serialNumbers")
    val serialNumbers: List<String>? = null,

    @SerializedName("containerId")
    val containerId: String? = null,

    @SerializedName("containerCode")
    val containerCode: String? = null,

    @SerializedName("containerType")
    val containerType: String? = null,

    @SerializedName("receivingMode")
    val receivingMode: String = "SKU",

    @SerializedName("deviceType")
    val deviceType: String = "PDA"
)

/**
 * 收货结果
 */
data class ReceivingResult(
    @SerializedName("asnLine")
    val asnLine: AsnLine,

    @SerializedName("totalReceivedQty")
    val totalReceivedQty: Int,

    @SerializedName("totalReceivedLines")
    val totalReceivedLines: Int,

    @SerializedName("newStatus")
    val newStatus: String
)

data class ReceivingLookupSkuResult(
    @SerializedName("asnLine")
    val asnLine: AsnLine,

    @SerializedName("sku")
    val sku: SkuInfo,

    @SerializedName("availableBatchLines")
    val availableBatchLines: List<AvailableBatchLineOption> = emptyList()
)

data class AvailableBatchLineOption(
    @SerializedName("id")
    val id: String,

    @SerializedName("lineNumber")
    val lineNumber: Int,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("expectedQty")
    val expectedQty: Int,

    @SerializedName("receivedQty")
    val receivedQty: Int,

    @SerializedName("remainingQty")
    val remainingQty: Int
)

data class ContainerLookupResult(
    @SerializedName("id")
    val id: String,

    @SerializedName("containerCode")
    val containerCode: String,

    @SerializedName("containerType")
    val containerType: String,

    @SerializedName("purpose")
    val purpose: String,

    @SerializedName("status")
    val status: String,

    @SerializedName("isEnabled")
    val isEnabled: Boolean,

    @SerializedName("warehouseId")
    val warehouseId: String,

    @SerializedName("currentAsnId")
    val currentAsnId: String? = null,

    @SerializedName("closedAt")
    val closedAt: String? = null
)

data class ContainerItemsResult(
    @SerializedName("items")
    val items: List<ContainerItemInfo> = emptyList(),

    @SerializedName("summary")
    val summary: ContainerItemsSummary? = null
)

data class ContainerItemInfo(
    @SerializedName("id")
    val id: String
)

data class ContainerItemsSummary(
    @SerializedName("itemCount")
    val itemCount: Int = 0
)

data class ContainerCloseResult(
    @SerializedName("id")
    val id: String,

    @SerializedName("containerCode")
    val containerCode: String,

    @SerializedName("asnUpdated")
    val asnUpdated: Boolean = false
)

data class CaptureFirstReceivingRequest(
    @SerializedName("isSelfPackaged")
    val isSelfPackaged: Boolean,

    @SerializedName("lengthCm")
    val lengthCm: Double,

    @SerializedName("widthCm")
    val widthCm: Double,

    @SerializedName("heightCm")
    val heightCm: Double,

    @SerializedName("weightKg")
    val weightKg: Double
)
