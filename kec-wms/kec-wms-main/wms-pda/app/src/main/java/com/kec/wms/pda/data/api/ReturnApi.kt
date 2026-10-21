package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.ReturnCountLineRequest
import com.kec.wms.pda.data.model.ReturnLookupRequest
import com.kec.wms.pda.data.model.ReturnOrder
import com.kec.wms.pda.data.model.ReturnOrderLine
import com.kec.wms.pda.data.model.ReturnPhotoUploadResult
import com.kec.wms.pda.data.model.ReturnPutawayExecuteRequest
import com.kec.wms.pda.data.model.ReturnPutawayExecuteResult
import com.kec.wms.pda.data.model.ReturnPutawayOrder
import com.kec.wms.pda.data.model.ReturnSignInConfirmRequest
import com.kec.wms.pda.data.model.ReturnSignInLookupResult
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path

interface ReturnApi {
    @POST(ApiPaths.Returns.SIGN_IN_LOOKUP)
    suspend fun lookupSignIn(
        @Body request: ReturnLookupRequest
    ): ApiResponse<ReturnSignInLookupResult>

    @POST(ApiPaths.Returns.SIGN_IN_CONFIRM)
    suspend fun confirmSignIn(
        @Body request: ReturnSignInConfirmRequest
    ): ApiResponse<ReturnOrder>

    @POST(ApiPaths.Returns.COUNTING_LOOKUP)
    suspend fun lookupCounting(
        @Body request: ReturnLookupRequest
    ): ApiResponse<ReturnOrder>

    @POST(ApiPaths.Returns.COUNT_LINE_SUBMIT)
    suspend fun submitCountLine(
        @Path("id") returnOrderId: String,
        @Body request: ReturnCountLineRequest
    ): ApiResponse<ReturnOrderLine>

    @POST(ApiPaths.Returns.COUNTING_COMPLETE)
    suspend fun completeCounting(
        @Path("id") returnOrderId: String
    ): ApiResponse<ReturnOrder>

    @Multipart
    @POST(ApiPaths.Returns.PHOTO_UPLOAD)
    suspend fun uploadPhoto(
        @Part file: MultipartBody.Part
    ): ApiResponse<ReturnPhotoUploadResult>

    @GET(ApiPaths.Returns.PUTAWAY_ORDERS)
    suspend fun getPutawayOrders(): ApiResponse<List<ReturnPutawayOrder>>

    @POST(ApiPaths.Returns.PUTAWAY_EXECUTE)
    suspend fun executePutaway(
        @Body request: ReturnPutawayExecuteRequest
    ): ApiResponse<ReturnPutawayExecuteResult>
}
