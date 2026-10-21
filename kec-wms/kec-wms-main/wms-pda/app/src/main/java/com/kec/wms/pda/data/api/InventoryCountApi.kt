package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.InventoryCountBatchDetailResponse
import com.kec.wms.pda.data.model.InventoryCountBatchSummary
import com.kec.wms.pda.data.model.SubmitInventoryCountLineRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface InventoryCountApi {

    @GET(ApiPaths.Inventory.COUNT_BATCHES)
    suspend fun getCountBatches(): ApiResponse<List<InventoryCountBatchSummary>>

    @GET(ApiPaths.Inventory.COUNT_BATCH_DETAIL)
    suspend fun getCountBatchDetail(
        @Path("orderId") orderId: String,
        @Path("batchId") batchId: String,
        @Query("locationCode") locationCode: String? = null,
        @Query("skuOrBarcode") skuOrBarcode: String? = null,
    ): ApiResponse<InventoryCountBatchDetailResponse>

    @POST(ApiPaths.Inventory.COUNT_BATCH_START)
    suspend fun startCountBatch(
        @Path("orderId") orderId: String,
        @Path("batchId") batchId: String,
    ): ApiResponse<InventoryCountBatchDetailResponse>

    @POST(ApiPaths.Inventory.COUNT_LINE_SUBMIT)
    suspend fun submitCountLine(
        @Path("orderId") orderId: String,
        @Path("batchId") batchId: String,
        @Path("detailId") detailId: String,
        @Body request: SubmitInventoryCountLineRequest,
    ): ApiResponse<InventoryCountBatchDetailResponse>

    @POST(ApiPaths.Inventory.COUNT_SCOPE_SUBMIT)
    suspend fun submitCountScopeLine(
        @Path("orderId") orderId: String,
        @Body request: SubmitInventoryCountLineRequest,
    ): ApiResponse<InventoryCountBatchDetailResponse>

    @POST(ApiPaths.Inventory.COUNT_BATCH_COMPLETE)
    suspend fun completeCountBatch(
        @Path("orderId") orderId: String,
        @Path("batchId") batchId: String,
    ): ApiResponse<InventoryCountBatchDetailResponse>
}
