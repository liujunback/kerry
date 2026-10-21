package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class PutawayOrderDetail(
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

    @SerializedName("warehouse")
    val warehouse: WarehouseInfo? = null,

    @SerializedName("client")
    val client: ClientInfo? = null,

    @SerializedName("asn")
    val asn: PutawayAsnInfo? = null,

    @SerializedName("putawayTasks")
    val putawayTasks: List<PutawayTask> = emptyList(),

    @SerializedName("progress")
    val progress: PutawayProgress? = null,
)

data class PutawayAsnInfo(
    @SerializedName("asnNumber")
    val asnNumber: String,
)

data class PutawayProgress(
    @SerializedName("totalQty")
    val totalQty: Int,

    @SerializedName("putawayQty")
    val putawayQty: Int,

    @SerializedName("pendingQty")
    val pendingQty: Int,

    @SerializedName("percentage")
    val percentage: Int,

    @SerializedName("taskCount")
    val taskCount: Int,

    @SerializedName("completedTaskCount")
    val completedTaskCount: Int,
)

data class PutawayTask(
    @SerializedName("id")
    val id: String,

    @SerializedName("putawayTaskNumber")
    val putawayTaskNumber: String,

    @SerializedName("skuId")
    val skuId: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String? = null,

    @SerializedName("barcode")
    val barcode: String? = null,

    @SerializedName("status")
    val status: String,

    @SerializedName("quantity")
    val quantity: Int,

    @SerializedName("putawayQty")
    val putawayQty: Int,

    @SerializedName("remainingQty")
    val remainingQty: Int,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("qualityType")
    val qualityType: String,

    @SerializedName("containerId")
    val containerId: String? = null,

    @SerializedName("isSerialManaged")
    val isSerialManaged: Boolean = false,

    @SerializedName("serialNumbers")
    val serialNumbers: List<String> = emptyList(),
)

data class PutawayLocation(
    @SerializedName("id")
    val id: String,

    @SerializedName("locationCode")
    val locationCode: String,

    @SerializedName("zoneId")
    val zoneId: String? = null,

    @SerializedName("zoneName")
    val zoneName: String? = null,

    @SerializedName("zoneCode")
    val zoneCode: String? = null,

    @SerializedName("zoneQualityType")
    val zoneQualityType: String = "GOOD",

    @SerializedName("warehouseId")
    val warehouseId: String,
)

data class PutawayContainerDetail(
    @SerializedName("container")
    val container: PutawayContainerInfo,

    @SerializedName("items")
    val items: List<PutawayContainerItem> = emptyList(),
)

data class PutawayContainerInfo(
    @SerializedName("id")
    val id: String,

    @SerializedName("containerCode")
    val containerCode: String,

    @SerializedName("containerType")
    val containerType: String,

    @SerializedName("workStatus")
    val workStatus: String,

    @SerializedName("warehouseId")
    val warehouseId: String,
)

data class PutawayContainerItem(
    @SerializedName("id")
    val id: String,

    @SerializedName("skuId")
    val skuId: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("skuName")
    val skuName: String? = null,

    @SerializedName("barcode")
    val barcode: String? = null,

    @SerializedName("quantity")
    val quantity: Int,

    @SerializedName("availableQty")
    val availableQty: Int,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("qualityStatus")
    val qualityStatus: String,

    @SerializedName("isSerialManaged")
    val isSerialManaged: Boolean = false,

    @SerializedName("serialNumbers")
    val serialNumbers: List<String> = emptyList(),
)

data class PutawaySubmitRequest(
    @SerializedName("mode")
    val mode: String = "sku",

    @SerializedName("containerId")
    val containerId: String? = null,

    @SerializedName("containerCode")
    val containerCode: String? = null,

    @SerializedName("locationId")
    val locationId: String,

    @SerializedName("locationCode")
    val locationCode: String,

    @SerializedName("skuId")
    val skuId: String,

    @SerializedName("skuCode")
    val skuCode: String,

    @SerializedName("quantity")
    val quantity: Int,

    @SerializedName("qualityStatus")
    val qualityStatus: String? = null,

    @SerializedName("serialNumbers")
    val serialNumbers: List<String> = emptyList(),

    @SerializedName("warehouseId")
    val warehouseId: String? = null,

    @SerializedName("clientId")
    val clientId: String? = null,

    @SerializedName("putawayOrderId")
    val putawayOrderId: String? = null,

    @SerializedName("putawayLineId")
    val putawayLineId: String? = null,

    @SerializedName("batchNumber")
    val batchNumber: String? = null,

    @SerializedName("expiryDate")
    val expiryDate: String? = null,

    @SerializedName("deviceType")
    val deviceType: String = "PDA",
)

data class PutawaySubmitResult(
    @SerializedName("inventoryId")
    val inventoryId: String,

    @SerializedName("detailId")
    val detailId: String? = null,
)
