package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.PutawayOrderDetail
import com.kec.wms.pda.data.repository.PutawayRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class LoadPutawayOrderUseCase @Inject constructor(
    private val putawayRepository: PutawayRepository,
    @ApplicationContext private val context: Context
) {
    suspend operator fun invoke(orderNumber: String): Result<PutawayOrderDetail> {
        if (orderNumber.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.putaway_feedback_order_required)))
        }

        return putawayRepository.getPutawayOrder(orderNumber.trim())
    }
}
