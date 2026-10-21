package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.ReturnApi
import com.kec.wms.pda.data.api.toApiException
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
import com.kec.wms.pda.data.model.toResult
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody

@Singleton
class ReturnRepository @Inject constructor(
    private val returnApi: ReturnApi
) {
    suspend fun lookupSignIn(logisticsNo: String): Result<ReturnSignInLookupResult> {
        return try {
            returnApi.lookupSignIn(ReturnLookupRequest(logisticsNo)).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询退件签收失败"))
        }
    }

    suspend fun confirmSignIn(request: ReturnSignInConfirmRequest): Result<ReturnOrder> {
        return try {
            returnApi.confirmSignIn(request).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("确认退件签收失败"))
        }
    }

    suspend fun lookupCounting(logisticsNo: String): Result<ReturnOrder> {
        return try {
            returnApi.lookupCounting(ReturnLookupRequest(logisticsNo)).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询退件清点失败"))
        }
    }

    suspend fun submitCountLine(returnOrderId: String, request: ReturnCountLineRequest): Result<ReturnOrderLine> {
        return try {
            returnApi.submitCountLine(returnOrderId, request).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("提交退件清点失败"))
        }
    }

    suspend fun completeCounting(returnOrderId: String): Result<ReturnOrder> {
        return try {
            returnApi.completeCounting(returnOrderId).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("完成退件清点失败"))
        }
    }

    suspend fun uploadPhoto(file: File): Result<ReturnPhotoUploadResult> {
        return try {
            val body = file.asRequestBody("image/jpeg".toMediaType())
            val part = MultipartBody.Part.createFormData("file", file.name, body)
            returnApi.uploadPhoto(part).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("上传退件照片失败"))
        }
    }

    suspend fun getPutawayOrders(): Result<List<ReturnPutawayOrder>> {
        return try {
            returnApi.getPutawayOrders().toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询退件上架单失败"))
        }
    }

    suspend fun executePutaway(request: ReturnPutawayExecuteRequest): Result<ReturnPutawayExecuteResult> {
        return try {
            returnApi.executePutaway(request).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("提交退件上架失败"))
        }
    }
}
