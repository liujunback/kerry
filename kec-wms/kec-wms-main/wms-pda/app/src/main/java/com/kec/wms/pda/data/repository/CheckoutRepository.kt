package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.CheckoutApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.model.CheckoutConfirmRequest
import com.kec.wms.pda.data.model.CheckoutConfirmResult
import com.kec.wms.pda.data.model.CheckoutScanRequest
import com.kec.wms.pda.data.model.CheckoutScanResult
import com.kec.wms.pda.data.model.CheckoutValidateRequest
import com.kec.wms.pda.data.model.CheckoutWorkspace
import com.kec.wms.pda.data.model.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class CheckoutRepository @Inject constructor(
    private val checkoutApi: CheckoutApi
) {

    suspend fun validateContainer(
        containerNumber: String,
        checkoutType: String,
        warehouseId: String?
    ): Result<CheckoutWorkspace> {
        return try {
            checkoutApi.validateContainer(
                CheckoutValidateRequest(
                    containerNumber = containerNumber,
                    checkoutType = checkoutType,
                    warehouseId = warehouseId
                )
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("打开容器失败"))
        }
    }

    suspend fun scanOrder(
        checkoutOrderId: String,
        scannedNumber: String,
        checkoutType: String
    ): Result<CheckoutScanResult> {
        return try {
            checkoutApi.scanOrder(
                CheckoutScanRequest(
                    checkoutOrderId = checkoutOrderId,
                    scannedNumber = scannedNumber,
                    checkoutType = checkoutType
                )
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("扫描签出失败"))
        }
    }

    suspend fun confirmCheckout(
        checkoutOrderId: String,
        checkoutType: String
    ): Result<CheckoutConfirmResult> {
        return try {
            checkoutApi.confirmCheckout(
                CheckoutConfirmRequest(
                    checkoutOrderId = checkoutOrderId,
                    checkoutType = checkoutType
                )
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("确认签出失败"))
        }
    }
}
