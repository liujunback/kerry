package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.ManifestMountScanResult
import com.kec.wms.pda.data.repository.ManifestMountRepository
import javax.inject.Inject

class ScanManifestCheckoutUseCase @Inject constructor(
    private val manifestMountRepository: ManifestMountRepository
) {
    suspend operator fun invoke(
        manifestOrderId: String,
        checkoutNumber: String
    ): Result<ManifestMountScanResult> {
        return manifestMountRepository.scanCheckout(
            manifestOrderId = manifestOrderId,
            checkoutNumber = checkoutNumber.trim()
        )
    }
}
