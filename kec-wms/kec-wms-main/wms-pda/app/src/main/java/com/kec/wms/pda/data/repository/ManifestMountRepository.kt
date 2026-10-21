package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.ManifestMountApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.model.ManifestMountConfirmRequest
import com.kec.wms.pda.data.model.ManifestMountConfirmResult
import com.kec.wms.pda.data.model.ManifestMountScanRequest
import com.kec.wms.pda.data.model.ManifestMountScanResult
import com.kec.wms.pda.data.model.ManifestMountValidateRequest
import com.kec.wms.pda.data.model.ManifestMountWorkspace
import com.kec.wms.pda.data.model.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ManifestMountRepository @Inject constructor(
    private val manifestMountApi: ManifestMountApi
) {

    suspend fun validateManifest(manifestNumber: String): Result<ManifestMountWorkspace> {
        return try {
            manifestMountApi.validateManifest(
                ManifestMountValidateRequest(manifestNumber = manifestNumber)
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("校验集运单失败"))
        }
    }

    suspend fun scanCheckout(
        manifestOrderId: String,
        checkoutNumber: String
    ): Result<ManifestMountScanResult> {
        return try {
            manifestMountApi.scanCheckout(
                ManifestMountScanRequest(
                    manifestOrderId = manifestOrderId,
                    checkoutNumber = checkoutNumber
                )
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("挂载签出单失败"))
        }
    }

    suspend fun confirmManifest(
        manifestOrderId: String
    ): Result<ManifestMountConfirmResult> {
        return try {
            manifestMountApi.confirmManifest(
                ManifestMountConfirmRequest(manifestOrderId = manifestOrderId)
            ).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("完结集运失败"))
        }
    }
}
