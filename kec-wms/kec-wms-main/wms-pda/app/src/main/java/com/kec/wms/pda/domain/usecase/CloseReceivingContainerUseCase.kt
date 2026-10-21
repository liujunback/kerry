package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.ContainerCloseResult
import com.kec.wms.pda.data.repository.AsnRepository
import javax.inject.Inject

class CloseReceivingContainerUseCase @Inject constructor(
    private val asnRepository: AsnRepository
) {
    suspend operator fun invoke(containerId: String): Result<ContainerCloseResult> {
        return asnRepository.closeContainer(containerId)
    }
}
