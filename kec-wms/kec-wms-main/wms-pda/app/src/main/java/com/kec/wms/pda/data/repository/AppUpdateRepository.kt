package com.kec.wms.pda.data.repository

import com.kec.wms.pda.BuildConfig
import com.kec.wms.pda.data.api.AppUpdateApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.model.AppUpdateInfo
import com.kec.wms.pda.data.model.toResult
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppUpdateRepository @Inject constructor(
    private val appUpdateApi: AppUpdateApi
) {
    suspend fun fetchLatestVersion(): Result<AppUpdateInfo> {
        return try {
            appUpdateApi.getAppVersion()
                .toResult()
                .map { info ->
                    info.copy(downloadUrl = resolveDownloadUrl(info.downloadUrl))
                }
        } catch (e: Exception) {
            Result.failure(e.toApiException("检查应用更新失败"))
        }
    }

    private fun resolveDownloadUrl(downloadUrl: String): String {
        return URI(BuildConfig.API_BASE_URL).resolve(downloadUrl).toString()
    }
}
