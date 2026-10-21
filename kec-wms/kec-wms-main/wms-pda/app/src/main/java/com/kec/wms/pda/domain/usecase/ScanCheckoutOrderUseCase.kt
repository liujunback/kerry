package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.CheckoutScanResult
import com.kec.wms.pda.data.repository.CheckoutRepository
import javax.inject.Inject

class ScanCheckoutOrderUseCase @Inject constructor(
    private val checkoutRepository: CheckoutRepository
) {
    suspend operator fun invoke(
        checkoutOrderId: String,
        scannedNumber: String,
        checkoutType: String
    ): Result<CheckoutScanResult> {
        return checkoutRepository.scanOrder(checkoutOrderId, scannedNumber, checkoutType)
    }
}
