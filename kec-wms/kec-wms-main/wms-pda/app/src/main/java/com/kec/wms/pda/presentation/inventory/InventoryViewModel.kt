package com.kec.wms.pda.presentation.inventory

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.InventoryCandidate
import com.kec.wms.pda.data.model.InventoryLookupResult
import com.kec.wms.pda.data.model.InventorySubmitRequest
import com.kec.wms.pda.data.repository.InventoryRepository
import com.kec.wms.pda.presentation.common.PdaActionState
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import com.kec.wms.pda.presentation.common.PdaUiEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class InventoryWorkflowMode {
    Adjust,
    Transfer,
}

data class InventoryUiState(
    val mode: InventoryWorkflowMode = InventoryWorkflowMode.Adjust,
    val isLoading: Boolean = false,
    val submitAction: PdaActionState = PdaActionState.Idle,
    val sourceLocation: String = "",
    val skuOrBarcode: String = "",
    val targetLocation: String = "",
    val matches: List<InventoryCandidate> = emptyList(),
    val hasMultipleCandidates: Boolean = false,
    val selectedCandidateId: String = "",
    val showAsnSelectorDialog: Boolean = false,
    val client: String = "",
    val beforeQuantity: String = "",
    val quality: String = "",
    val asn: String = "",
    val expiryDate: String = "",
    val batchNo: String = "",
    val adjustType: InventoryAdjustType = InventoryAdjustType.Increase,
    val adjustQuantity: String = "",
    val adjustReason: InventoryAdjustReason = InventoryAdjustReason.Surplus,
    val feedbackMessage: String? = null,
    val feedbackTone: PdaFeedbackTone = PdaFeedbackTone.Info,
)

@HiltViewModel
class InventoryViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(InventoryUiState())
    val uiState: StateFlow<InventoryUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun enterMode(mode: InventoryWorkflowMode) {
        _uiState.update {
            InventoryUiState(
                mode = mode,
                adjustType = it.adjustType,
                adjustReason = it.adjustReason
            )
        }
    }

    fun updateSourceLocation(value: String) {
        _uiState.update { current ->
            val hasChanged = current.sourceLocation.trim() != value.trim()
            current.copy(
                sourceLocation = value,
                targetLocation = current.targetLocation,
                feedbackMessage = null,
                matches = if (hasChanged) emptyList() else current.matches,
                hasMultipleCandidates = if (hasChanged) false else current.hasMultipleCandidates,
                selectedCandidateId = if (hasChanged) "" else current.selectedCandidateId,
                showAsnSelectorDialog = if (hasChanged) false else current.showAsnSelectorDialog,
                client = if (hasChanged) "" else current.client,
                beforeQuantity = if (hasChanged) "" else current.beforeQuantity,
                quality = if (hasChanged) "" else current.quality,
                asn = if (hasChanged) "" else current.asn,
                expiryDate = if (hasChanged) "" else current.expiryDate,
                batchNo = if (hasChanged) "" else current.batchNo,
            )
        }
    }

    fun updateSkuOrBarcode(value: String) {
        _uiState.update { current ->
            val hasChanged = current.skuOrBarcode.trim() != value.trim()
            current.copy(
                skuOrBarcode = value,
                feedbackMessage = null,
                matches = if (hasChanged) emptyList() else current.matches,
                hasMultipleCandidates = if (hasChanged) false else current.hasMultipleCandidates,
                selectedCandidateId = if (hasChanged) "" else current.selectedCandidateId,
                showAsnSelectorDialog = if (hasChanged) false else current.showAsnSelectorDialog,
                client = if (hasChanged) "" else current.client,
                beforeQuantity = if (hasChanged) "" else current.beforeQuantity,
                quality = if (hasChanged) "" else current.quality,
                asn = if (hasChanged) "" else current.asn,
                expiryDate = if (hasChanged) "" else current.expiryDate,
                batchNo = if (hasChanged) "" else current.batchNo,
            )
        }
    }

    fun updateTargetLocation(value: String) {
        _uiState.update { it.copy(targetLocation = value, feedbackMessage = null) }
    }

    fun updateAdjustType(value: InventoryAdjustType) {
        _uiState.update { it.copy(adjustType = value, feedbackMessage = null) }
    }

    fun updateAdjustQuantity(value: String) {
        _uiState.update { it.copy(adjustQuantity = value, feedbackMessage = null) }
    }

    fun updateAdjustReason(value: InventoryAdjustReason) {
        _uiState.update { it.copy(adjustReason = value, feedbackMessage = null) }
    }

    fun selectCandidate(candidateId: String) {
        _uiState.update { current ->
            val candidate = current.matches.firstOrNull { it.inventoryId == candidateId }
            if (candidate == null) {
                current
            } else {
                current.copy(
                    selectedCandidateId = candidate.inventoryId,
                    showAsnSelectorDialog = false,
                    client = candidate.client?.clientName.orEmpty(),
                    beforeQuantity = candidate.quantity.toString(),
                    quality = bucketTypeLabel(candidate.bucketType),
                    asn = candidate.asnNumber.ifBlank { context.getString(R.string.inventory_asn_empty) },
                    expiryDate = formatDisplayDate(candidate.expiryDate),
                    batchNo = candidate.batchNumber,
                    feedbackMessage = null
                )
            }
        }
    }

    fun dismissAsnSelectorDialog() {
        _uiState.update { it.copy(showAsnSelectorDialog = false) }
    }

    fun lookupInventory() {
        val state = _uiState.value
        val locationCode = state.sourceLocation.trim()
        val skuOrBarcode = state.skuOrBarcode.trim()
        val locationRequiredMessage = if (state.mode == InventoryWorkflowMode.Transfer) {
            context.getString(R.string.inventory_error_old_location_required)
        } else {
            context.getString(R.string.inventory_error_location_required)
        }

        when {
            locationCode.isBlank() -> {
                showError(locationRequiredMessage)
                return
            }

            skuOrBarcode.isBlank() -> {
                showError(context.getString(R.string.inventory_error_sku_required))
                return
            }
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    feedbackMessage = null
                )
            }

            inventoryRepository.lookupInventory(locationCode, skuOrBarcode)
                .onSuccess { result ->
                    val hasMultipleCandidates = result.hasMultipleMatches || result.matches.size > 1
                    applyLookupResult(
                        result = result,
                        showAsnSelectorDialog = hasMultipleCandidates
                    )
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            matches = emptyList(),
                            hasMultipleCandidates = false,
                            selectedCandidateId = "",
                            showAsnSelectorDialog = false,
                            client = "",
                            beforeQuantity = "",
                            quality = "",
                            asn = "",
                            expiryDate = "",
                            batchNo = "",
                            feedbackMessage = error.message ?: context.getString(R.string.inventory_error_lookup_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
        }
    }

    fun submit() {
        val state = _uiState.value
        val quantity = state.adjustQuantity.trim().toIntOrNull()
        val selectedCandidate = when {
            state.selectedCandidateId.isNotBlank() ->
                state.matches.firstOrNull { it.inventoryId == state.selectedCandidateId }
            !state.hasMultipleCandidates -> state.matches.firstOrNull()
            else -> null
        }

        when {
            state.sourceLocation.trim().isBlank() -> {
                showError(
                    if (state.mode == InventoryWorkflowMode.Transfer) {
                        context.getString(R.string.inventory_error_old_location_required)
                    } else {
                        context.getString(R.string.inventory_error_location_required)
                    }
                )
                return
            }

            state.skuOrBarcode.trim().isBlank() -> {
                showError(context.getString(R.string.inventory_error_sku_required))
                return
            }

            selectedCandidate == null -> {
                showError(context.getString(R.string.inventory_error_candidate_required))
                return
            }

            state.mode == InventoryWorkflowMode.Transfer && state.targetLocation.trim().isBlank() -> {
                showError(context.getString(R.string.inventory_error_new_location_required))
                return
            }

            quantity == null || quantity <= 0 -> {
                showError(context.getString(R.string.inventory_error_quantity_invalid))
                return
            }
        }

        val submitQuantity = quantity ?: return
        val candidate = selectedCandidate ?: return

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    submitAction = PdaActionState.Running,
                    feedbackMessage = null
                )
            }

            val request = InventorySubmitRequest(
                mode = if (state.mode == InventoryWorkflowMode.Transfer) "TRANSFER" else "ADJUST",
                skuId = candidate.skuId,
                locationId = candidate.locationId,
                quantity = submitQuantity,
                reason = context.getString(state.adjustReason.labelRes),
                batchNumber = candidate.batchNumber.ifBlank { null },
                lpn = candidate.lpn.ifBlank { null },
                asnNumber = candidate.asnNumber.ifBlank { null },
                expiryDate = candidate.expiryDate,
                bucketType = candidate.bucketType,
                productionDate = null,
                adjustType = if (state.mode == InventoryWorkflowMode.Adjust) {
                    if (state.adjustType == InventoryAdjustType.Increase) "INCREASE" else "DECREASE"
                } else {
                    null
                },
                targetLocationCode = state.targetLocation.trim().ifBlank { null }
            )

            inventoryRepository.submitInventoryAdjustment(request)
                .onSuccess {
                    _uiState.update { current ->
                        resetAfterSuccess(current.mode)
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            submitAction = PdaActionState.Error,
                            feedbackMessage = error.message ?: context.getString(R.string.inventory_error_submit_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
        }
    }

    private fun resetAfterSuccess(mode: InventoryWorkflowMode): InventoryUiState {
        return InventoryUiState(
            mode = mode,
            adjustType = InventoryAdjustType.Increase,
            adjustReason = InventoryAdjustReason.Surplus,
            submitAction = PdaActionState.Success,
            feedbackMessage = context.getString(
                if (mode == InventoryWorkflowMode.Transfer) {
                    R.string.inventory_transfer_success
                } else {
                    R.string.inventory_adjust_success
                }
            ),
            feedbackTone = PdaFeedbackTone.Success
        )
    }

    private fun applyLookupResult(
        result: InventoryLookupResult,
        showAsnSelectorDialog: Boolean = false,
        preserveFeedback: Boolean = false,
        submitAction: PdaActionState = PdaActionState.Idle
    ) {
        val hasMultipleCandidates = result.hasMultipleMatches || result.matches.size > 1
        val selected = if (hasMultipleCandidates) {
            null
        } else {
            result.matches.firstOrNull()
        }

        _uiState.update { current ->
            current.copy(
                isLoading = false,
                submitAction = submitAction,
                matches = result.matches,
                hasMultipleCandidates = hasMultipleCandidates,
                selectedCandidateId = selected?.inventoryId.orEmpty(),
                showAsnSelectorDialog = showAsnSelectorDialog,
                client = selected?.client?.clientName.orEmpty(),
                beforeQuantity = selected?.quantity?.toString().orEmpty(),
                quality = selected?.bucketType?.let(::bucketTypeLabel).orEmpty(),
                asn = selected?.asnNumber?.ifBlank { context.getString(R.string.inventory_asn_empty) }.orEmpty(),
                expiryDate = formatDisplayDate(selected?.expiryDate),
                batchNo = selected?.batchNumber.orEmpty(),
                feedbackMessage = if (preserveFeedback) current.feedbackMessage else context.getString(R.string.inventory_lookup_success),
                feedbackTone = if (preserveFeedback) current.feedbackTone else PdaFeedbackTone.Success
            )
        }
    }

    private fun formatDisplayDate(value: String?): String {
        if (value.isNullOrBlank()) {
            return ""
        }
        return if (value.length >= 10) value.substring(0, 10) else value
    }

    private fun bucketTypeLabel(bucketType: String): String {
        return when (bucketType.uppercase()) {
            "AVAILABLE" -> context.getString(R.string.inventory_quality_available)
            "DEFECTIVE" -> context.getString(R.string.inventory_quality_defective)
            "FROZEN" -> context.getString(R.string.inventory_quality_frozen)
            "QC_HOLD" -> context.getString(R.string.inventory_quality_qc_hold)
            "COUNT_HOLD" -> context.getString(R.string.inventory_quality_count_hold)
            else -> bucketType
        }
    }

    private fun showError(message: String) {
        _uiState.update {
            it.copy(
                feedbackMessage = message,
                feedbackTone = PdaFeedbackTone.Error,
                submitAction = PdaActionState.Error
            )
        }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
    }

    private fun resolveErrorSound(message: String?): PdaSoundEvent {
        val normalized = message.orEmpty()
        return when {
            normalized.contains("网络", ignoreCase = true) -> PdaSoundEvent.SystemError
            normalized.contains("服务器", ignoreCase = true) -> PdaSoundEvent.SystemError
            normalized.contains("timeout", ignoreCase = true) -> PdaSoundEvent.SystemError
            else -> PdaSoundEvent.BusinessError
        }
    }
}
