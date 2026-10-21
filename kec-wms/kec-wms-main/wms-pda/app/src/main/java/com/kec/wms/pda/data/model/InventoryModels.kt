package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class InventoryLookupResult(
    @SerializedName("location")
    val location: InventoryLookupLocation,

    @SerializedName("sku")
    val sku: InventoryLookupSku,

    @SerializedName("matches")
    val matches: List<InventoryCandidate>,

    @SerializedName("selectedInventoryId")
    val selectedInventoryId: String? = null,

    @SerializedName("hasMultipleMatches")
    val hasMultipleMatches: Boolean = false,

    @SerializedName("hasMultipleAsn")
    val hasMultipleAsn: Boolean = false
)

data class InventoryQueryResult(
    @SerializedName("location")
    val location: InventoryLookupLocation? = null,

    @SerializedName("sku")
    val sku: InventoryLookupSku? = null,

    @SerializedName("items")
    val items: List<InventoryQueryItem>,

    @SerializedName("total")
    val total: Int
)

data class InventoryLookupLocation(
    @SerializedName("id")
    val id: String,

    @SerializedName("locationCode")
    val locationCode: String,

    @SerializedName("warehouseId")
    val warehouseId: String
)

data class InventoryLookupSku(
    @SerializedName("id")
    val id: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String,

    @SerializedName("barcode")
    val barcode: String? = null
)

data class InventoryQueryItem(
    @SerializedName("client")
    val client: InventoryClientInfo? = null,

    @SerializedName("locationCode")
    val locationCode: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String,

    @SerializedName("asnNumber")
    val asnNumber: String = "",

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("batchNumber")
    val batchNumber: String = "",

    @SerializedName("quantityAvailable")
    val quantityAvailable: Int = 0,

    @SerializedName("quantityOccupied")
    val quantityOccupied: Int = 0,

    @SerializedName("quantityDefective")
    val quantityDefective: Int = 0,

    @SerializedName("quantityFrozen")
    val quantityFrozen: Int = 0,

    @SerializedName("totalQuantity")
    val totalQuantity: Int = 0
)

data class InventoryCandidate(
    @SerializedName("inventoryId")
    val inventoryId: String,

    @SerializedName("skuId")
    val skuId: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("locationId")
    val locationId: String,

    @SerializedName("locationCode")
    val locationCode: String,

    @SerializedName("clientId")
    val clientId: String? = null,

    @SerializedName("quantity")
    val quantity: Int,

    @SerializedName("bucketType")
    val bucketType: String,

    @SerializedName("asnNumber")
    val asnNumber: String = "",

    @SerializedName("batchNumber")
    val batchNumber: String = "",

    @SerializedName("lpn")
    val lpn: String = "",

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("client")
    val client: InventoryClientInfo? = null
)

data class InventoryClientInfo(
    @SerializedName("id")
    val id: String,

    @SerializedName("clientCode")
    val clientCode: String,

    @SerializedName("clientName")
    val clientName: String
)

data class InventorySubmitRequest(
    @SerializedName("mode")
    val mode: String,

    @SerializedName("skuId")
    val skuId: String,

    @SerializedName("locationId")
    val locationId: String,

    @SerializedName("quantity")
    val quantity: Int,

    @SerializedName("reason")
    val reason: String,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("lpn")
    val lpn: String? = null,

    @SerializedName("asnNumber")
    val asnNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("bucketType")
    val bucketType: String? = null,

    @SerializedName("productionDate")
    val productionDate: String? = null,

    @SerializedName("adjustType")
    val adjustType: String? = null,

    @SerializedName("targetLocationCode")
    val targetLocationCode: String? = null
)

data class InventorySubmitResult(
    @SerializedName("adjustmentId")
    val adjustmentId: String,

    @SerializedName("adjustmentNumber")
    val adjustmentNumber: String,

    @SerializedName("adjustmentType")
    val adjustmentType: String
)
