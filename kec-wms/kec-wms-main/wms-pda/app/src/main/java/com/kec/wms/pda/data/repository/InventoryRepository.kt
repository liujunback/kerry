package com.kec.wms.pda.data.repository

import com.kec.wms.pda.data.api.InventoryApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.model.InventoryLookupResult
import com.kec.wms.pda.data.model.InventoryQueryResult
import com.kec.wms.pda.data.model.InventorySubmitRequest
import com.kec.wms.pda.data.model.InventorySubmitResult
import com.kec.wms.pda.data.model.toResult
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class InventoryRepository @Inject constructor(
    private val inventoryApi: InventoryApi
) {

    suspend fun lookupInventoryQuery(locationCode: String, skuOrBarcode: String): Result<InventoryQueryResult> {
        return try {
            inventoryApi.lookupInventoryQuery(locationCode = locationCode, skuOrBarcode = skuOrBarcode).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询库存失败"))
        }
    }

    suspend fun lookupInventory(locationCode: String, skuOrBarcode: String): Result<InventoryLookupResult> {
        return try {
            inventoryApi.lookupInventory(locationCode = locationCode, skuOrBarcode = skuOrBarcode).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("查询库存失败"))
        }
    }

    suspend fun submitInventoryAdjustment(request: InventorySubmitRequest): Result<InventorySubmitResult> {
        return try {
            inventoryApi.submitInventoryAdjustment(request).toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("提交库存调整失败"))
        }
    }
}
