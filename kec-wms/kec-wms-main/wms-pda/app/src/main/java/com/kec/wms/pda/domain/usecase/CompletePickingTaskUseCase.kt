package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.CompletePickingTaskResponse
import com.kec.wms.pda.data.repository.PickingRepository
import javax.inject.Inject

class CompletePickingTaskUseCase @Inject constructor(
    private val pickingRepository: PickingRepository
) {
    suspend operator fun invoke(taskId: String): Result<CompletePickingTaskResponse> {
        return pickingRepository.completePickingTask(taskId)
    }
}
