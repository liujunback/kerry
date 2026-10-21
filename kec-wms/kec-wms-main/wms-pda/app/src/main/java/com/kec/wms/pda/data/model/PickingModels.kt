package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

data class PickingTaskSummary(
    @SerializedName("id")
    val id: String,
    @SerializedName("taskNumber")
    val taskNumber: String,
    @SerializedName("taskType")
    val taskType: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("orderCount")
    val orderCount: Int,
    @SerializedName("skuCount")
    val skuCount: Int,
    @SerializedName("locationCount")
    val locationCount: Int,
    @SerializedName("channel")
    val channel: String? = null,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("targetContainer")
    val targetContainer: String? = null,
    @SerializedName("totalLines")
    val totalLines: Int = 0,
    @SerializedName("totalQty")
    val totalQty: Int = 0,
    @SerializedName("pickedQty")
    val pickedQty: Int = 0,
)

data class PickingLine(
    @SerializedName("id")
    val id: String,
    @SerializedName("lineNumber")
    val lineNumber: Int,
    @SerializedName("status")
    val status: String,
    @SerializedName("orderId")
    val orderId: String,
    @SerializedName("orderNumber")
    val orderNumber: String,
    @SerializedName("locationCode")
    val locationCode: String,
    @SerializedName("skuCode")
    val skuCode: String,
    @SerializedName("skuName")
    val skuName: String,
    @SerializedName("barcode")
    val barcode: String? = null,
    @SerializedName("expectedQty")
    val expectedQty: Int,
    @SerializedName("pickedQty")
    val pickedQty: Int,
    @SerializedName("shortQty")
    val shortQty: Int,
    @SerializedName("remainingQty")
    val remainingQty: Int,
)

data class PickingTaskDetail(
    @SerializedName("id")
    val id: String,
    @SerializedName("taskNumber")
    val taskNumber: String,
    @SerializedName("taskType")
    val taskType: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("orderCount")
    val orderCount: Int,
    @SerializedName("skuCount")
    val skuCount: Int,
    @SerializedName("locationCount")
    val locationCount: Int,
    @SerializedName("channel")
    val channel: String? = null,
    @SerializedName("createdAt")
    val createdAt: String,
    @SerializedName("targetContainer")
    val targetContainer: String? = null,
    @SerializedName("totalLines")
    val totalLines: Int = 0,
    @SerializedName("totalQty")
    val totalQty: Int = 0,
    @SerializedName("pickedQty")
    val pickedQty: Int = 0,
    @SerializedName("downstreamMode")
    val downstreamMode: String? = null,
    @SerializedName("downstreamArea")
    val downstreamArea: String,
    @SerializedName("processedLines")
    val processedLines: Int,
    @SerializedName("totalShortQty")
    val totalShortQty: Int,
    @SerializedName("lines")
    val lines: List<PickingLine> = emptyList(),
    @SerializedName("recommendedLine")
    val recommendedLine: PickingLine? = null,
)

data class BindPickingContainerRequest(
    @SerializedName("containerCode")
    val containerCode: String,
)

data class BindPickingContainerResponse(
    @SerializedName("taskId")
    val taskId: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("targetContainer")
    val targetContainer: String,
    @SerializedName("detail")
    val detail: PickingTaskDetail? = null,
)

data class SubmitPickingLineRequest(
    @SerializedName("locationCode")
    val locationCode: String,
    @SerializedName("skuBarcode")
    val skuBarcode: String,
    @SerializedName("actualQty")
    val actualQty: Int,
    @SerializedName("shortageConfirmed")
    val shortageConfirmed: Boolean = false,
    @SerializedName("shortageReason")
    val shortageReason: String? = null,
)

data class SubmitPickingLineResponse(
    @SerializedName("detail")
    val detail: PickingTaskDetail,
    @SerializedName("isLastPendingLine")
    val isLastPendingLine: Boolean = false,
    @SerializedName("hasShortage")
    val hasShortage: Boolean = false,
    @SerializedName("shortageQty")
    val shortageQty: Int = 0,
    @SerializedName("totalShortQty")
    val totalShortQty: Int = 0,
)

data class CompletePickingTaskResponse(
    @SerializedName("taskId")
    val taskId: String,
    @SerializedName("status")
    val status: String,
    @SerializedName("totalPickedQty")
    val totalPickedQty: Int = 0,
    @SerializedName("totalShortQty")
    val totalShortQty: Int = 0,
    @SerializedName("downstreamArea")
    val downstreamArea: String,
)
