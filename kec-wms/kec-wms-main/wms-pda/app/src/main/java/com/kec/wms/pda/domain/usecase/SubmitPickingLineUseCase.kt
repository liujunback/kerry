package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.SubmitPickingLineResponse
import com.kec.wms.pda.data.repository.PickingRepository
import javax.inject.Inject

class SubmitPickingLineUseCase @Inject constructor(
    private val pickingRepository: PickingRepository
) {
    suspend operator fun invoke(
        taskId: String,
        lineId: String,
        locationCode: String,
        skuBarcode: String,
        actualQty: Int,
        shortageConfirmed: Boolean = false,
        shortageReason: String? = null
    ): Result<SubmitPickingLineResponse> {
        return pickingRepository.submitPickingLine(
            taskId = taskId,
            lineId = lineId,
            locationCode = locationCode,
            skuBarcode = skuBarcode,
            actualQty = actualQty,
            shortageConfirmed = shortageConfirmed,
            shortageReason = shortageReason
        )
    }
}
