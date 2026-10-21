package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.BindPickingContainerResponse
import com.kec.wms.pda.data.repository.PickingRepository
import javax.inject.Inject

class BindPickingContainerUseCase @Inject constructor(
    private val pickingRepository: PickingRepository
) {
    suspend operator fun invoke(
        taskId: String,
        containerCode: String
    ): Result<BindPickingContainerResponse> {
        return pickingRepository.bindPickingContainer(taskId, containerCode)
    }
}
