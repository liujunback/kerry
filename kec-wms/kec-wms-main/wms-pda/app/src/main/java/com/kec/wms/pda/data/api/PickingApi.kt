package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.BindPickingContainerRequest
import com.kec.wms.pda.data.model.BindPickingContainerResponse
import com.kec.wms.pda.data.model.CompletePickingTaskResponse
import com.kec.wms.pda.data.model.PickingTaskDetail
import com.kec.wms.pda.data.model.PickingTaskSummary
import com.kec.wms.pda.data.model.SubmitPickingLineRequest
import com.kec.wms.pda.data.model.SubmitPickingLineResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface PickingApi {

    @GET(ApiPaths.Outbound.PICKING_TASKS)
    suspend fun getPickingTasks(): ApiResponse<List<PickingTaskSummary>>

    @GET(ApiPaths.Outbound.PICKING_TASK_DETAIL)
    suspend fun getPickingTaskDetail(
        @Path("id") taskId: String
    ): ApiResponse<PickingTaskDetail>

    @POST(ApiPaths.Outbound.PICKING_BIND_CONTAINER)
    suspend fun bindPickingContainer(
        @Path("id") taskId: String,
        @Body request: BindPickingContainerRequest
    ): ApiResponse<BindPickingContainerResponse>

    @POST(ApiPaths.Outbound.PICKING_SUBMIT_LINE)
    suspend fun submitPickingLine(
        @Path("id") taskId: String,
        @Path("lineId") lineId: String,
        @Body request: SubmitPickingLineRequest
    ): ApiResponse<SubmitPickingLineResponse>

    @POST(ApiPaths.Outbound.PICKING_COMPLETE)
    suspend fun completePickingTask(
        @Path("id") taskId: String
    ): ApiResponse<CompletePickingTaskResponse>
}
