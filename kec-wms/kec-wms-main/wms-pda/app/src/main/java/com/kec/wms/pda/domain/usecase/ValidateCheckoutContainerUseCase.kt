package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.CheckoutWorkspace
import com.kec.wms.pda.data.repository.CheckoutRepository
import javax.inject.Inject

class ValidateCheckoutContainerUseCase @Inject constructor(
    private val checkoutRepository: CheckoutRepository
) {
    suspend operator fun invoke(
        containerNumber: String,
        checkoutType: String,
        warehouseId: String?
    ): Result<CheckoutWorkspace> {
        return checkoutRepository.validateContainer(containerNumber, checkoutType, warehouseId)
    }
}
