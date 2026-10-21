package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.PickingTaskDetail
import com.kec.wms.pda.data.repository.PickingRepository
import javax.inject.Inject

class LoadPickingTaskDetailUseCase @Inject constructor(
    private val pickingRepository: PickingRepository
) {
    suspend operator fun invoke(taskId: String): Result<PickingTaskDetail> {
        return pickingRepository.loadPickingTaskDetail(taskId)
    }
}
