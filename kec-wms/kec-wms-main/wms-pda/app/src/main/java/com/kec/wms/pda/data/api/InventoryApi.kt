package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.InventoryLookupResult
import com.kec.wms.pda.data.model.InventoryQueryResult
import com.kec.wms.pda.data.model.InventorySubmitRequest
import com.kec.wms.pda.data.model.InventorySubmitResult
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface InventoryApi {

    @GET(ApiPaths.Inventory.QUERY)
    suspend fun lookupInventoryQuery(
        @Query("locationCode") locationCode: String,
        @Query("skuOrBarcode") skuOrBarcode: String
    ): ApiResponse<InventoryQueryResult>

    @GET(ApiPaths.Inventory.ADJUSTMENT_LOOKUP)
    suspend fun lookupInventory(
        @Query("locationCode") locationCode: String,
        @Query("skuOrBarcode") skuOrBarcode: String
    ): ApiResponse<InventoryLookupResult>

    @POST(ApiPaths.Inventory.ADJUSTMENT_SUBMIT)
    suspend fun submitInventoryAdjustment(
        @Body request: InventorySubmitRequest
    ): ApiResponse<InventorySubmitResult>
}
