package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class ManifestMountValidateRequest(
    @SerializedName("manifestNumber")
    val manifestNumber: String
)

data class ManifestMountScanRequest(
    @SerializedName("manifestOrderId")
    val manifestOrderId: String,
    @SerializedName("checkoutNumber")
    val checkoutNumber: String
)

data class ManifestMountConfirmRequest(
    @SerializedName("manifestOrderId")
    val manifestOrderId: String
)

data class ManifestMountRecordSummary(
    @SerializedName("checkoutOrderId")
    val checkoutOrderId: String,
    @SerializedName("checkoutNumber")
    val checkoutNumber: String,
    @SerializedName("channelName")
    val channelName: String? = null,
    @SerializedName("orderCount")
    val orderCount: Int = 0,
    @SerializedName("parcelCount")
    val parcelCount: Int = 0,
    @SerializedName("scannedAt")
    val scannedAt: String? = null
)

data class ManifestMountWorkspace(
    @SerializedName("id")
    val id: String,
    @SerializedName("manifestNumber")
    val manifestNumber: String,
    @SerializedName("warehouseName")
    val warehouseName: String? = null,
    @SerializedName("channelName")
    val channelName: String? = null,
    @SerializedName("status")
    val status: String,
    @SerializedName("containerCount")
    val containerCount: Int = 0,
    @SerializedName("orderCount")
    val orderCount: Int = 0,
    @SerializedName("parcelCount")
    val parcelCount: Int = 0,
    @SerializedName("records")
    val records: List<ManifestMountRecordSummary> = emptyList()
)

data class ManifestMountScanResult(
    @SerializedName("record")
    val record: ManifestMountRecordSummary,
    @SerializedName("manifestOrderId")
    val manifestOrderId: String,
    @SerializedName("totalContainerCount")
    val totalContainerCount: Int,
    @SerializedName("totalOrderCount")
    val totalOrderCount: Int,
    @SerializedName("totalParcelCount")
    val totalParcelCount: Int
)

data class ManifestMountConfirmResult(
    @SerializedName("manifestNumber")
    val manifestNumber: String,
    @SerializedName("containerCount")
    val containerCount: Int = 0,
    @SerializedName("orderCount")
    val orderCount: Int = 0,
    @SerializedName("parcelCount")
    val parcelCount: Int = 0
)
