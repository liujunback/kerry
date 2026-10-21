package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.PickingApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.model.BindPickingContainerRequest
import com.kec.wms.pda.data.model.BindPickingContainerResponse
import com.kec.wms.pda.data.model.CompletePickingTaskResponse
import com.kec.wms.pda.data.model.PickingTaskDetail
import com.kec.wms.pda.data.model.PickingTaskSummary
import com.kec.wms.pda.data.model.SubmitPickingLineRequest
import com.kec.wms.pda.data.model.SubmitPickingLineResponse
import com.kec.wms.pda.data.model.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PickingRepository @Inject constructor(
    private val pickingApi: PickingApi
) {

    suspend fun loadPickingTasks(): Result<List<PickingTaskSummary>> {
        return try {
            pickingApi.getPickingTasks().toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("获取拣货任务失败"))
        }
    }

    suspend fun loadPickingTaskDetail(taskId: String): Result<PickingTaskDetail> {
        return try {
            pickingApi.getPickingTaskDetail(taskId).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("获取拣货任务详情失败"))
        }
    }

    suspend fun bindPickingContainer(
        taskId: String,
        containerCode: String
    ): Result<BindPickingContainerResponse> {
        return try {
            pickingApi.bindPickingContainer(
                taskId = taskId,
                request = BindPickingContainerRequest(containerCode = containerCode)
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("绑定拣货框失败"))
        }
    }

    suspend fun submitPickingLine(
        taskId: String,
        lineId: String,
        locationCode: String,
        skuBarcode: String,
        actualQty: Int,
        shortageConfirmed: Boolean = false,
        shortageReason: String? = null
    ): Result<SubmitPickingLineResponse> {
        return try {
            pickingApi.submitPickingLine(
                taskId = taskId,
                lineId = lineId,
                request = SubmitPickingLineRequest(
                    locationCode = locationCode,
                    skuBarcode = skuBarcode,
                    actualQty = actualQty,
                    shortageConfirmed = shortageConfirmed,
                    shortageReason = shortageReason
                )
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("提交拣货失败"))
        }
    }

    suspend fun completePickingTask(taskId: String): Result<CompletePickingTaskResponse> {
        return try {
            pickingApi.completePickingTask(taskId).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("完成拣货失败"))
        }
    }
}
