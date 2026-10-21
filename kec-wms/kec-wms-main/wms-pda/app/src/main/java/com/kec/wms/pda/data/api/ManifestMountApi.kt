package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.ManifestMountConfirmRequest
import com.kec.wms.pda.data.model.ManifestMountConfirmResult
import com.kec.wms.pda.data.model.ManifestMountScanRequest
import com.kec.wms.pda.data.model.ManifestMountScanResult
import com.kec.wms.pda.data.model.ManifestMountValidateRequest
import com.kec.wms.pda.data.model.ManifestMountWorkspace
import retrofit2.http.Body
import retrofit2.http.POST

interface ManifestMountApi {

    @POST(ApiPaths.Outbound.MANIFEST_MOUNT_VALIDATE)
    suspend fun validateManifest(
        @Body request: ManifestMountValidateRequest
    ): ApiResponse<ManifestMountWorkspace>

    @POST(ApiPaths.Outbound.MANIFEST_MOUNT_SCAN)
    suspend fun scanCheckout(
        @Body request: ManifestMountScanRequest
    ): ApiResponse<ManifestMountScanResult>

    @POST(ApiPaths.Outbound.MANIFEST_MOUNT_CONFIRM)
    suspend fun confirmManifest(
        @Body request: ManifestMountConfirmRequest
    ): ApiResponse<ManifestMountConfirmResult>
}
