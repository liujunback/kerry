package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.AppUpdateInfo
import retrofit2.http.GET

interface AppUpdateApi {
    @GET(ApiPaths.AppUpdate.APP_VERSION)
    suspend fun getAppVersion(): ApiResponse<AppUpdateInfo>
}
