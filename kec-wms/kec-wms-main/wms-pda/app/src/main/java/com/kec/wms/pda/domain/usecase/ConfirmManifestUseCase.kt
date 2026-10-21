package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.ManifestMountConfirmResult
import com.kec.wms.pda.data.repository.ManifestMountRepository
import javax.inject.Inject

class ConfirmManifestUseCase @Inject constructor(
    private val manifestMountRepository: ManifestMountRepository
) {
    suspend operator fun invoke(manifestOrderId: String): Result<ManifestMountConfirmResult> {
        return manifestMountRepository.confirmManifest(manifestOrderId)
    }
}
