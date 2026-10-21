package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class CheckoutValidateRequest(
    @SerializedName("containerNumber")
    val containerNumber: String,
    @SerializedName("checkoutType")
    val checkoutType: String,
    @SerializedName("warehouseId")
    val warehouseId: String? = null
)

data class CheckoutScanRequest(
    @SerializedName("checkoutOrderId")
    val checkoutOrderId: String,
    @SerializedName("scannedNumber")
    val scannedNumber: String,
    @SerializedName("checkoutType")
    val checkoutType: String
)

data class CheckoutConfirmRequest(
    @SerializedName("checkoutOrderId")
    val checkoutOrderId: String,
    @SerializedName("checkoutType")
    val checkoutType: String,
    @SerializedName("createMode")
    val createMode: String = "PRE_CREATE"
)

data class CheckoutWorkspace(
    @SerializedName("id")
    val id: String,
    @SerializedName("containerNumber")
    val containerNumber: String,
    @SerializedName("checkoutType")
    val checkoutType: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("channelName")
    val channelName: String? = null,
    @SerializedName("channelCode")
    val channelCode: String? = null,
    @SerializedName("orderCount")
    val orderCount: Int = 0,
    @SerializedName("parcelCount")
    val parcelCount: Int = 0,
    @SerializedName("records")
    val records: List<CheckoutRecordSummary> = emptyList()
)

data class CheckoutRecordSummary(
    @SerializedName("id")
    val id: String,
    @SerializedName("sequenceNumber")
    val sequenceNumber: Int,
    @SerializedName("scannedNumber")
    val scannedNumber: String,
    @SerializedName("orderNumber")
    val orderNumber: String?,
    @SerializedName("trackingNumber")
    val trackingNumber: String?,
    @SerializedName("channelName")
    val channelName: String?,
    @SerializedName("scannedAt")
    val scannedAt: String? = null
)

data class CheckoutScanResult(
    @SerializedName("record")
    val record: CheckoutRecordSummary,
    @SerializedName("checkoutOrderId")
    val checkoutOrderId: String,
    @SerializedName("orderCount")
    val orderCount: Int,
    @SerializedName("parcelCount")
    val parcelCount: Int
)

data class CheckoutConfirmResult(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("checkoutNumber")
    val checkoutNumber: String,
    @SerializedName("orderCount")
    val orderCount: Int,
    @SerializedName("parcelCount")
    val parcelCount: Int
)

data class CheckoutPendingOrder(
    @SerializedName("id")
    val id: String,
    @SerializedName("orderNumber")
    val orderNumber: String,
    @SerializedName("trackingNumber")
    val trackingNumber: String?,
    @SerializedName("channelCode")
    val channelCode: String?,
    @SerializedName("parcelCount")
    val parcelCount: Int
)
