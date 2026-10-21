package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.AsnApi
import com.kec.wms.pda.data.api.toApiException
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
import com.kec.wms.pda.data.model.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AsnRepository @Inject constructor(
    private val asnApi: AsnApi
) {

    suspend fun signInAsn(asnNumber: String): Result<AsnDetail> {
        return try {
            val response = asnApi.signInAsn(AsnSignInRequest(asnNumber = asnNumber))
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("签收失败"))
        }
    }

    suspend fun lookupAsn(asnNumber: String, receivingMode: String): Result<AsnDetail> {
        return try {
            val response = asnApi.lookupAsn(asnNumber, receivingMode)
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("ASN查询失败"))
        }
    }

    suspend fun lookupReceivingSku(
        asnId: String,
        barcode: String
    ): Result<ReceivingLookupSkuResult> {
        return try {
            val response = asnApi.lookupReceivingSku(asnId, barcode)
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("SKU查询失败"))
        }
    }

    suspend fun lookupContainer(
        containerCode: String,
        warehouseId: String
    ): Result<ContainerLookupResult> {
        return try {
            val response = asnApi.lookupContainer(containerCode, warehouseId)
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("容器查询失败"))
        }
    }

    suspend fun getContainerItems(containerId: String): Result<ContainerItemsResult> {
        return try {
            val response = asnApi.getContainerItems(containerId)
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("获取容器物品失败"))
        }
    }

    suspend fun resetContainer(containerId: String): Result<Unit> {
        return try {
            val response = asnApi.resetContainer(containerId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message ?: "重置容器失败"))
            }
        } catch (e: Exception) {
            Result.failure(e.toApiException("重置容器失败"))
        }
    }

    suspend fun closeContainer(containerId: String): Result<ContainerCloseResult> {
        return try {
            val response = asnApi.closeContainer(containerId)
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("关箱失败"))
        }
    }

    suspend fun captureFirstReceiving(
        skuId: String,
        request: CaptureFirstReceivingRequest
    ): Result<SkuInfo> {
        return try {
            val response = asnApi.captureFirstReceiving(skuId, request)
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("保存新品信息失败"))
        }
    }

    suspend fun submitReceiving(
        asnId: String,
        request: ReceivingRequest
    ): Result<ReceivingResult> {
        return try {
            val response = asnApi.submitReceiving(asnId, request)
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("收货失败"))
        }
    }

    suspend fun completeReceiving(asnId: String): Result<Unit> {
        return try {
            val response = asnApi.completeReceiving(asnId)
            if (response.success) {
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message))
            }
        } catch (e: Exception) {
            Result.failure(e.toApiException("收货完结失败"))
        }
    }
}
