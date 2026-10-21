package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.PutawayContainerDetail
import com.kec.wms.pda.data.model.PutawayLocation
import com.kec.wms.pda.data.model.PutawayOrderDetail
import com.kec.wms.pda.data.model.PutawaySubmitRequest
import com.kec.wms.pda.data.model.PutawaySubmitResult
import retrofit2.http.GET
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Query

interface PutawayApi {

    @GET(ApiPaths.Inbound.PUTAWAY_ORDER_DETAIL)
    suspend fun getPutawayOrder(
        @Query("orderNumber") orderNumber: String,
        @Query("merge") merge: Boolean = true,
    ): ApiResponse<PutawayOrderDetail>

    @GET(ApiPaths.Inbound.PUTAWAY_CONTAINER)
    suspend fun getContainer(
        @Query("containerCode") containerCode: String,
        @Query("warehouseId") warehouseId: String? = null,
    ): ApiResponse<PutawayContainerDetail>

    @GET(ApiPaths.Inbound.PUTAWAY_LOCATION)
    suspend fun getLocation(
        @Query("locationCode") locationCode: String,
        @Query("warehouseId") warehouseId: String,
    ): ApiResponse<PutawayLocation>

    @POST(ApiPaths.Inbound.PUTAWAY_SUBMIT)
    suspend fun submitPutaway(
        @Body request: PutawaySubmitRequest
    ): ApiResponse<PutawaySubmitResult>
}
