package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.PutawayContainerDetail
import com.kec.wms.pda.data.repository.PutawayRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class LookupPutawayContainerUseCase @Inject constructor(
    private val putawayRepository: PutawayRepository,
    @ApplicationContext private val context: Context
) {
    suspend operator fun invoke(
        containerCode: String,
        warehouseId: String? = null
    ): Result<PutawayContainerDetail> {
        if (containerCode.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.putaway_feedback_container_required)))
        }

        return putawayRepository.getContainer(
            containerCode = containerCode.trim(),
            warehouseId = warehouseId?.trim()?.takeIf { it.isNotBlank() }
        )
    }
}
