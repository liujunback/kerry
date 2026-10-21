package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.CheckoutConfirmRequest
import com.kec.wms.pda.data.model.CheckoutConfirmResult
import com.kec.wms.pda.data.model.CheckoutPendingOrder
import com.kec.wms.pda.data.model.CheckoutScanRequest
import com.kec.wms.pda.data.model.CheckoutScanResult
import com.kec.wms.pda.data.model.CheckoutValidateRequest
import com.kec.wms.pda.data.model.CheckoutWorkspace
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface CheckoutApi {

    @POST(ApiPaths.Outbound.CHECKOUT_VALIDATE)
    suspend fun validateContainer(
        @Body request: CheckoutValidateRequest
    ): ApiResponse<CheckoutWorkspace>

    @POST(ApiPaths.Outbound.CHECKOUT_SCAN)
    suspend fun scanOrder(
        @Body request: CheckoutScanRequest
    ): ApiResponse<CheckoutScanResult>

    @POST(ApiPaths.Outbound.CHECKOUT_CONFIRM)
    suspend fun confirmCheckout(
        @Body request: CheckoutConfirmRequest
    ): ApiResponse<CheckoutConfirmResult>

    @GET(ApiPaths.Outbound.CHECKOUT_PENDING)
    suspend fun getPendingOrders(): ApiResponse<List<CheckoutPendingOrder>>
}
