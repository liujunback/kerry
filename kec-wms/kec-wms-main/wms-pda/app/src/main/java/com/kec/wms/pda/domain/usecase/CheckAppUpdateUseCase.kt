package com.kec.wms.pda.domain.usecase

import com.kec.wms.pda.data.model.AppUpdateInfo
import com.kec.wms.pda.data.repository.AppUpdateRepository
import javax.inject.Inject

class CheckAppUpdateUseCase @Inject constructor(
    private val repository: AppUpdateRepository
) {
    suspend operator fun invoke(): Result<AppUpdateInfo> {
        return repository.fetchLatestVersion()
    }
}
