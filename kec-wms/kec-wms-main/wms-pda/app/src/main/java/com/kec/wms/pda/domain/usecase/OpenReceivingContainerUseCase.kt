package com.kec.wms.pda.domain.usecase

import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.ContainerLookupResult
import com.kec.wms.pda.data.repository.AsnRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

class OpenReceivingContainerUseCase @Inject constructor(
    private val asnRepository: AsnRepository,
    @ApplicationContext private val context: Context
) {
    suspend operator fun invoke(
        containerCode: String,
        warehouseId: String,
        asnId: String
    ): Result<ContainerLookupResult> {
        if (containerCode.isBlank()) {
            return Result.failure(Exception(context.getString(R.string.receiving_container_required)))
        }

        val container = asnRepository.lookupContainer(containerCode.trim(), warehouseId)
            .getOrElse { return Result.failure(it) }

        if (container.purpose != "INBOUND") {
            return Result.failure(Exception(context.getString(R.string.receiving_container_wrong_purpose)))
        }

        if (!container.isEnabled) {
            return Result.failure(Exception(context.getString(R.string.receiving_container_disabled)))
        }

        if (container.status == "CLOSED" || !container.closedAt.isNullOrBlank()) {
            return Result.failure(Exception(context.getString(R.string.receiving_container_closed)))
        }

        if (container.status != "IDLE" && container.status != "OCCUPIED") {
            return Result.failure(Exception(context.getString(R.string.receiving_container_wrong_status)))
        }

        if (!container.currentAsnId.isNullOrBlank() && container.currentAsnId != asnId) {
            val items = asnRepository.getContainerItems(container.id).getOrElse { return Result.failure(it) }
            if ((items.summary?.itemCount ?: items.items.size) > 0) {
                return Result.failure(Exception(context.getString(R.string.receiving_container_occupied)))
            }

            asnRepository.resetContainer(container.id).getOrElse { return Result.failure(it) }
        }

        return Result.success(container)
    }
}
