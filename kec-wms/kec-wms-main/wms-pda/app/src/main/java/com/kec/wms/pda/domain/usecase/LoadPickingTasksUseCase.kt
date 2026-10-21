package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.PickingTaskSummary
import com.kec.wms.pda.data.repository.PickingRepository
import javax.inject.Inject

class LoadPickingTasksUseCase @Inject constructor(
    private val pickingRepository: PickingRepository
) {
    suspend operator fun invoke(): Result<List<PickingTaskSummary>> {
        return pickingRepository.loadPickingTasks()
    }
}
