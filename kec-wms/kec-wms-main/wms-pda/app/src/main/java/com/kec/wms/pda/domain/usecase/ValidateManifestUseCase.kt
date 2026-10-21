package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.ManifestMountWorkspace
import com.kec.wms.pda.data.repository.ManifestMountRepository
import javax.inject.Inject

class ValidateManifestUseCase @Inject constructor(
    private val manifestMountRepository: ManifestMountRepository
) {
    suspend operator fun invoke(manifestNumber: String): Result<ManifestMountWorkspace> {
        return manifestMountRepository.validateManifest(manifestNumber.trim())
    }
}
