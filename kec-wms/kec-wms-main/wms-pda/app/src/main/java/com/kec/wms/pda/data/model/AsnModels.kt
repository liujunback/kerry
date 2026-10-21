package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class AsnDetail(
    @SerializedName("id")
    val id: String,

    @SerializedName("asnNumber")
    val asnNumber: String,

    @SerializedName("externalNumber")
    val externalNumber: String?,

    @SerializedName("status")
    val status: String,

    @SerializedName("signedAt")
    val signedAt: String? = null,

    @SerializedName("warehouseId")
    val warehouseId: String,

    @SerializedName("client")
    val client: ClientInfo?,

    @SerializedName("warehouse")
    val warehouse: WarehouseInfo?,

    @SerializedName("totalExpectedQty")
    val totalExpectedQty: Int,

    @SerializedName("totalReceivedQty")
    val totalReceivedQty: Int,

    @SerializedName("totalExpectedLines")
    val totalExpectedLines: Int,

    @SerializedName("totalReceivedLines")
    val totalReceivedLines: Int,

    @SerializedName("asnLines")
    val asnLines: List<AsnLine>? = null,

    @SerializedName("createdAt")
    val createdAt: String
)

data class AsnSignInRequest(
    @SerializedName("asnNumber")
    val asnNumber: String
)

data class AsnLine(
    @SerializedName("id")
    val id: String,

    @SerializedName("lineNumber")
    val lineNumber: Int,

    @SerializedName("skuId")
    val skuId: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String,

    @SerializedName("expectedQty")
    val expectedQty: Int,

    @SerializedName("receivedQty")
    val receivedQty: Int,

    @SerializedName("receivedGoodQty")
    val receivedGoodQty: Int,

    @SerializedName("receivedDamagedQty")
    val receivedDamagedQty: Int,

    @SerializedName("status")
    val status: String,

    @SerializedName("batchNumber")
    val batchNumber: String?,

    @SerializedName("expiryDate")
    val expiryDate: String?,

    @SerializedName("sku")
    val sku: SkuInfo?
)

data class SkuInfo(
    @SerializedName("id")
    val id: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String,

    @SerializedName("barcode")
    val barcode: String?,

    @SerializedName("isFirstReceiving")
    val isFirstReceiving: Boolean,

    @SerializedName("isSelfPackaged")
    val isSelfPackaged: Boolean = false,

    @SerializedName("isBatchManaged")
    val isBatchManaged: Boolean,

    @SerializedName("isSerialManaged")
    val isSerialManaged: Boolean,

    @SerializedName("isExpiryManaged")
    val isExpiryManaged: Boolean,

    @SerializedName("lengthCm")
    val lengthCm: Double? = null,

    @SerializedName("widthCm")
    val widthCm: Double? = null,

    @SerializedName("heightCm")
    val heightCm: Double? = null,

    @SerializedName("weightKg")
    val weightKg: Double? = null
)

data class ClientInfo(
    @SerializedName("id")
    val id: String? = null,

    @SerializedName("clientCode")
    val clientCode: String,

    @SerializedName("clientName")
    val clientName: String
)

data class WarehouseInfo(
    @SerializedName("id")
    val id: String,

    @SerializedName("warehouseCode")
    val warehouseCode: String,

    @SerializedName("warehouseName")
    val warehouseName: String
)
