package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.InventoryCountApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.model.InventoryCountBatchDetailResponse
import com.kec.wms.pda.data.model.InventoryCountBatchSummary
import com.kec.wms.pda.data.model.SubmitInventoryCountLineRequest
import com.kec.wms.pda.data.model.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InventoryCountRepository @Inject constructor(
    private val inventoryCountApi: InventoryCountApi
) {

    suspend fun loadBatches(): Result<List<InventoryCountBatchSummary>> {
        return try {
            inventoryCountApi.getCountBatches().toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException())
        }
    }

    suspend fun loadBatchDetail(
        orderId: String,
        batchId: String,
        locationCode: String? = null,
        skuOrBarcode: String? = null,
    ): Result<InventoryCountBatchDetailResponse> {
        return try {
            inventoryCountApi.getCountBatchDetail(
                orderId = orderId,
                batchId = batchId,
                locationCode = locationCode,
                skuOrBarcode = skuOrBarcode,
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException())
        }
    }

    suspend fun startBatch(
        orderId: String,
        batchId: String,
    ): Result<InventoryCountBatchDetailResponse> {
        return try {
            inventoryCountApi.startCountBatch(orderId, batchId).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException())
        }
    }

    suspend fun submitLine(
        orderId: String,
        batchId: String,
        detailId: String,
        request: SubmitInventoryCountLineRequest,
    ): Result<InventoryCountBatchDetailResponse> {
        return try {
            inventoryCountApi.submitCountLine(orderId, batchId, detailId, request).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException())
        }
    }

    suspend fun submitScopeLine(
        orderId: String,
        request: SubmitInventoryCountLineRequest,
    ): Result<InventoryCountBatchDetailResponse> {
        return try {
            inventoryCountApi.submitCountScopeLine(orderId, request).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException())
        }
    }

    suspend fun completeBatch(
        orderId: String,
        batchId: String,
    ): Result<InventoryCountBatchDetailResponse> {
        return try {
            inventoryCountApi.completeCountBatch(orderId, batchId).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException())
        }
    }
}
