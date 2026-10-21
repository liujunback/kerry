package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.AsnDetail
import com.kec.wms.pda.data.model.AsnSignInRequest
import com.kec.wms.pda.data.model.CaptureFirstReceivingRequest
import com.kec.wms.pda.data.model.ContainerCloseResult
import com.kec.wms.pda.data.model.ContainerItemsResult
import com.kec.wms.pda.data.model.ContainerLookupResult
import com.kec.wms.pda.data.model.ReceivingRequest
import com.kec.wms.pda.data.model.ReceivingLookupSkuResult
import com.kec.wms.pda.data.model.ReceivingResult
import com.kec.wms.pda.data.model.SkuInfo
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface AsnApi {

    @POST(ApiPaths.Inbound.ASN_SIGN_IN)
    suspend fun signInAsn(
        @Body request: AsnSignInRequest
    ): ApiResponse<AsnDetail>

    @GET(ApiPaths.Inbound.ASN_LOOKUP)
    suspend fun lookupAsn(
        @Query("asnNumber") asnNumber: String,
        @Query("receivingMode") receivingMode: String = "SKU"
    ): ApiResponse<AsnDetail>

    @GET(ApiPaths.Inbound.ASN_RECEIVING_LOOKUP_SKU)
    suspend fun lookupReceivingSku(
        @Path("id") asnId: String,
        @Query("barcode") barcode: String
    ): ApiResponse<ReceivingLookupSkuResult>

    @GET(ApiPaths.Container.LOOKUP)
    suspend fun lookupContainer(
        @Query("containerCode") containerCode: String,
        @Query("warehouseId") warehouseId: String
    ): ApiResponse<ContainerLookupResult>

    @GET(ApiPaths.Container.ITEMS)
    suspend fun getContainerItems(
        @Path("id") containerId: String
    ): ApiResponse<ContainerItemsResult>

    @POST(ApiPaths.Container.RESET)
    suspend fun resetContainer(
        @Path("id") containerId: String
    ): ApiResponse<Unit>

    @POST(ApiPaths.Container.CLOSE)
    suspend fun closeContainer(
        @Path("id") containerId: String
    ): ApiResponse<ContainerCloseResult>

    @POST(ApiPaths.Sku.CAPTURE_DIMENSIONS)
    suspend fun captureFirstReceiving(
        @Path("id") skuId: String,
        @Body request: CaptureFirstReceivingRequest
    ): ApiResponse<SkuInfo>

    @POST(ApiPaths.Inbound.ASN_RECEIVING_SKU)
    suspend fun submitReceiving(
        @Path("id") asnId: String,
        @Body request: ReceivingRequest
    ): ApiResponse<ReceivingResult>

    @POST(ApiPaths.Inbound.ASN_RECEIVING_COMPLETE)
    suspend fun completeReceiving(
        @Path("id") asnId: String
    ): ApiResponse<Unit>
}
