package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.PutawayApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.model.PutawayContainerDetail
import com.kec.wms.pda.data.model.PutawayLocation
import com.kec.wms.pda.data.model.PutawayOrderDetail
import com.kec.wms.pda.data.model.PutawaySubmitRequest
import com.kec.wms.pda.data.model.PutawaySubmitResult
import com.kec.wms.pda.data.model.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PutawayRepository @Inject constructor(
    private val putawayApi: PutawayApi
) {

    suspend fun getPutawayOrder(orderNumber: String): Result<PutawayOrderDetail> {
        return try {
            putawayApi.getPutawayOrder(orderNumber = orderNumber).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询上架单失败"))
        }
    }

    suspend fun getContainer(
        containerCode: String,
        warehouseId: String? = null
    ): Result<PutawayContainerDetail> {
        return try {
            putawayApi.getContainer(containerCode = containerCode, warehouseId = warehouseId).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询容器失败"))
        }
    }

    suspend fun getLocation(locationCode: String, warehouseId: String): Result<PutawayLocation> {
        return try {
            putawayApi.getLocation(locationCode = locationCode, warehouseId = warehouseId).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询上架库位失败"))
        }
    }

    suspend fun submitPutaway(request: PutawaySubmitRequest): Result<PutawaySubmitResult> {
        return try {
            putawayApi.submitPutaway(request).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("提交上架失败"))
        }
    }
}
