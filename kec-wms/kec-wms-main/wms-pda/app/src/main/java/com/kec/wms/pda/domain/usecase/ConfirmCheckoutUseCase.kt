package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.CheckoutConfirmResult
import com.kec.wms.pda.data.repository.CheckoutRepository
import javax.inject.Inject

class ConfirmCheckoutUseCase @Inject constructor(
    private val checkoutRepository: CheckoutRepository
) {
    suspend operator fun invoke(
        checkoutOrderId: String,
        checkoutType: String
    ): Result<CheckoutConfirmResult> {
        return checkoutRepository.confirmCheckout(checkoutOrderId, checkoutType)
    }
}
