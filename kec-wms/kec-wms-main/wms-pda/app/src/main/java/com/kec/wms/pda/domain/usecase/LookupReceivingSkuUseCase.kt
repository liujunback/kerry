package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.ReceivingLookupSkuResult
import com.kec.wms.pda.data.repository.AsnRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class LookupReceivingSkuUseCase @Inject constructor(
    private val asnRepository: AsnRepository,
    @ApplicationContext private val context: Context
) {
    suspend operator fun invoke(
        asnId: String,
        barcode: String
    ): Result<ReceivingLookupSkuResult> {
        if (barcode.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.receiving_sku_required)))
        }

        return asnRepository.lookupReceivingSku(asnId, barcode.trim())
    }
}
