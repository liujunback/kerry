package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.PutawaySubmitRequest
import com.kec.wms.pda.data.model.PutawaySubmitResult
import com.kec.wms.pda.data.repository.PutawayRepository
import javax.inject.Inject

class SubmitPutawayUseCase @Inject constructor(
    private val putawayRepository: PutawayRepository
) {
    suspend operator fun invoke(request: PutawaySubmitRequest): Result<PutawaySubmitResult> {
        return putawayRepository.submitPutaway(request)
    }
}
