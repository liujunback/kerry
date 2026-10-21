package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.PutawayLocation
import com.kec.wms.pda.data.repository.PutawayRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class LookupPutawayLocationUseCase @Inject constructor(
    private val putawayRepository: PutawayRepository,
    @ApplicationContext private val context: Context
) {
    suspend operator fun invoke(locationCode: String, warehouseId: String): Result<PutawayLocation> {
        if (locationCode.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.putaway_feedback_location_required)))
        }
        if (warehouseId.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.putaway_feedback_order_required)))
        }

        return putawayRepository.getLocation(locationCode.trim(), warehouseId)
    }
}
