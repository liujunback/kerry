package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.CaptureFirstReceivingRequest
import com.kec.wms.pda.data.model.SkuInfo
import com.kec.wms.pda.data.repository.AsnRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class CaptureFirstReceivingUseCase @Inject constructor(
    private val asnRepository: AsnRepository,
    @ApplicationContext private val context: Context
) {
    suspend operator fun invoke(
        skuId: String,
        isSelfPackaged: Boolean,
        lengthCm: Double,
        widthCm: Double,
        heightCm: Double,
        weightKg: Double
    ): Result<SkuInfo> {
        if (lengthCm <= 0 || widthCm <= 0 || heightCm <= 0 || weightKg <= 0) {
            return Result.failure(Exception(context.getString(R.string.receiving_first_receiving_invalid_dimensions)))
        }

        return asnRepository.captureFirstReceiving(
            skuId = skuId,
            request = CaptureFirstReceivingRequest(
                isSelfPackaged = isSelfPackaged,
                lengthCm = lengthCm,
                widthCm = widthCm,
                heightCm = heightCm,
                weightKg = weightKg
            )
        )
    }
}
