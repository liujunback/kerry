package com.kec.wms.pda.presentation.inventory

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.InventoryCountBatchSummary
import com.kec.wms.pda.data.model.InventoryCountDetail
import com.kec.wms.pda.data.model.InventoryCountSubmitScope
import com.kec.wms.pda.data.model.SubmitInventoryCountLineRequest
import com.kec.wms.pda.data.repository.InventoryCountRepository
import com.kec.wms.pda.presentation.common.PdaActionState
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import com.kec.wms.pda.presentation.common.PdaUiEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class InventoryCountPhase {
    List,
    Work,
}

data class InventoryCountGroupedQuantity(
    val quantity: Int,
    val batchNumber: String,
    val expiryDate: String?,
)

private fun expiryDateKey(expiryDate: String?): String {
    val value = expiryDate.orEmpty().trim()
    return if (value.isBlank()) "1000-01-01" else value.take(10)
}

private fun detailScope(detail: InventoryCountDetail): InventoryCountSubmitScope {
    return InventoryCountSubmitScope(
        locationId = detail.locationId,
        skuId = detail.skuId,
        batchNumber = detail.batchNumber,
        lpn = detail.lpn,
        bucketType = detail.bucketType,
        expiryDateKey = expiryDateKey(detail.expiryDate),
    )
}

data class InventoryCountUiState(
    val phase: InventoryCountPhase = InventoryCountPhase.List,
    val isLoadingList: Boolean = false,
    val isLoadingDetail: Boolean = false,
    val submitAction: PdaActionState = PdaActionState.Idle,
    val completeAction: PdaActionState = PdaActionState.Idle,
    val batches: List<InventoryCountBatchSummary> = emptyList(),
    val selectedBatch: InventoryCountBatchSummary? = null,
    val details: List<InventoryCountDetail> = emptyList(),
    val targetLocationCode: String = "",
    val locationInput: String = "",
    val locationConfirmed: Boolean = false,
    val skuInput: String = "",
    val quantityInput: String = "",
    val selectedDetailId: String = "",
    val feedbackMessage: String? = null,
    val feedbackTone: PdaFeedbackTone = PdaFeedbackTone.Info,
) {
    val selectedDetail: InventoryCountDetail?
        get() = details.firstOrNull { it.id == selectedDetailId }

    val selectedGroupedQuantity: InventoryCountGroupedQuantity?
        get() {
            val detail = selectedDetail ?: return null
            val batch = selectedBatch ?: return null
            val quantity = details
                .filter { item ->
                    isInventoryCountDetailPending(batch.batchType, item.status) &&
                        item.locationCode.equals(detail.locationCode, ignoreCase = true) &&
                        item.skuCode.equals(detail.skuCode, ignoreCase = true) &&
                        item.expiryDate.orEmpty() == detail.expiryDate.orEmpty() &&
                        item.lpn == detail.lpn &&
                        item.batchNumber == detail.batchNumber &&
                        item.bucketType == detail.bucketType
                }
                .sumOf { it.bookQuantity }
            return InventoryCountGroupedQuantity(
                quantity = quantity,
                batchNumber = detail.batchNumber,
                expiryDate = detail.expiryDate,
            )
        }

    val pendingDetailCount: Int
        get() = selectedBatch?.let { batch ->
            details.count { detail -> isInventoryCountDetailPending(batch.batchType, detail.status) }
        } ?: 0

    val currentCountingLocation: String
        get() = targetLocationCode.trim()

    val isLocationConfirmed: Boolean
        get() = locationConfirmed &&
            targetLocationCode.isNotBlank() &&
            locationInput.trim().equals(targetLocationCode, ignoreCase = true)
}

fun isInventoryCountDetailPending(batchType: String, status: String): Boolean {
    return if (batchType == "RECOUNT") {
        status == "RECOUNT_PENDING"
    } else {
        status == "PENDING"
    }
}

private fun nextPendingLocationCode(
    batch: InventoryCountBatchSummary,
    details: List<InventoryCountDetail>,
    excludeLocationCode: String? = null,
): String {
    return details.firstOrNull { detail ->
        isInventoryCountDetailPending(batch.batchType, detail.status) &&
            (excludeLocationCode == null || !detail.locationCode.equals(excludeLocationCode, ignoreCase = true))
    }?.locationCode.orEmpty()
}

private fun isExecutableBatchStatus(status: String): Boolean {
    return status == "READY" || status == "IN_PROGRESS" || status == "RECOUNTING"
}

@HiltViewModel
class InventoryCountViewModel @Inject constructor(
    private val repository: InventoryCountRepository,
    @ApplicationContext private val context: Context,
) : ViewModel() {

    private val _uiState = MutableStateFlow(InventoryCountUiState())
    val uiState: StateFlow<InventoryCountUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun enterScreen() {
        _uiState.update {
            it.copy(
                phase = InventoryCountPhase.List,
                selectedBatch = null,
                details = emptyList(),
                targetLocationCode = "",
                locationInput = "",
                locationConfirmed = false,
                skuInput = "",
                quantityInput = "",
                selectedDetailId = "",
                feedbackMessage = null,
            )
        }
        loadBatches()
    }

    fun reset() {
        _uiState.value = InventoryCountUiState()
    }

    fun backToList() {
        _uiState.update {
            it.copy(
                phase = InventoryCountPhase.List,
                selectedBatch = null,
                details = emptyList(),
                targetLocationCode = "",
                locationInput = "",
                locationConfirmed = false,
                skuInput = "",
                quantityInput = "",
                selectedDetailId = "",
                feedbackMessage = null,
            )
        }
        loadBatches()
    }

    fun clearFeedback() {
        _uiState.update { it.copy(feedbackMessage = null) }
    }

    fun updateLocationInput(value: String) {
        _uiState.update {
            it.copy(
                locationInput = value,
                locationConfirmed = false,
                selectedDetailId = "",
                skuInput = "",
                quantityInput = "",
                feedbackMessage = null,
            )
        }
    }

    fun updateSkuInput(value: String) {
        _uiState.update {
            it.copy(
                skuInput = value,
                selectedDetailId = "",
                quantityInput = "",
                feedbackMessage = null,
            )
        }
    }

    fun updateQuantityInput(value: String) {
        _uiState.update { it.copy(quantityInput = value, feedbackMessage = null) }
    }

    fun loadBatches(clearFeedback: Boolean = true) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingList = true,
                    feedbackMessage = if (clearFeedback) null else it.feedbackMessage,
                )
            }
            repository.loadBatches()
                .onSuccess { batches ->
                    _uiState.update {
                        it.copy(
                            isLoadingList = false,
                            batches = batches,
                            feedbackMessage = if (clearFeedback) null else it.feedbackMessage,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoadingList = false,
                            batches = emptyList(),
                            feedbackMessage = error.message ?: context.getString(R.string.inventory_count_error_load_batches),
                            feedbackTone = PdaFeedbackTone.Error,
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.SystemError))
                }
        }
    }

    fun openBatch(batch: InventoryCountBatchSummary) {
        viewModelScope.launch {
            openBatchForWork(batch, context.getString(R.string.inventory_count_feedback_batch_loaded))
        }
    }

    fun validateLocation(scannedCode: String): Boolean {
        val locationCode = scannedCode.trim()
        val state = _uiState.value
        val batch = state.selectedBatch
        val targetLocationCode = state.targetLocationCode.trim()
        if (batch == null) {
            showBusinessError(context.getString(R.string.inventory_count_error_batch_required))
            return false
        }
        if (locationCode.isBlank()) {
            showBusinessError(context.getString(R.string.inventory_count_error_location_required))
            return false
        }
        if (targetLocationCode.isBlank()) {
            showBusinessError(context.getString(R.string.inventory_count_error_no_target_location))
            return false
        }
        if (!locationCode.equals(targetLocationCode, ignoreCase = true)) {
            showBusinessError(context.getString(R.string.inventory_count_error_location_mismatch, targetLocationCode))
            return false
        }

        val pendingCount = state.details.count { detail ->
            detail.locationCode.equals(targetLocationCode, ignoreCase = true) &&
                isInventoryCountDetailPending(batch.batchType, detail.status)
        }
        if (pendingCount == 0) {
            showBusinessError(context.getString(R.string.inventory_count_error_location_no_pending))
            return false
        }

        _uiState.update {
            it.copy(
                locationInput = targetLocationCode,
                locationConfirmed = true,
                skuInput = "",
                quantityInput = "",
                selectedDetailId = "",
                feedbackMessage = context.getString(R.string.inventory_count_feedback_location_loaded, pendingCount),
                feedbackTone = PdaFeedbackTone.Success,
            )
        }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
        return true
    }

    fun validateSku(scannedCode: String): Boolean {
        val skuOrBarcode = scannedCode.trim()
        val state = _uiState.value
        val batch = state.selectedBatch
        val locationCode = state.targetLocationCode.trim()
        if (batch == null) {
            showSkuScanError(context.getString(R.string.inventory_count_error_batch_required))
            return false
        }
        if (locationCode.isBlank() || !state.isLocationConfirmed) {
            showSkuScanError(context.getString(R.string.inventory_count_error_location_required))
            return false
        }
        if (skuOrBarcode.isBlank()) {
            showSkuScanError(context.getString(R.string.inventory_count_error_sku_required))
            return false
        }

        val matches = state.details.filter { detail ->
            detail.locationCode.equals(locationCode, ignoreCase = true) &&
                isInventoryCountDetailPending(batch.batchType, detail.status) &&
                (detail.skuCode.equals(skuOrBarcode, ignoreCase = true) ||
                    detail.barcode.equals(skuOrBarcode, ignoreCase = true))
        }

        val selected = matches.firstOrNull()
        if (selected == null) {
            showSkuScanError(context.getString(R.string.inventory_count_error_sku_no_pending))
            return false
        }

        _uiState.update {
            it.copy(
                skuInput = skuOrBarcode,
                quantityInput = "",
                selectedDetailId = selected.id,
                feedbackMessage = if (matches.size > 1) {
                    context.getString(R.string.inventory_count_feedback_sku_multi_match, matches.size)
                } else {
                    context.getString(R.string.inventory_count_feedback_sku_loaded)
                },
                feedbackTone = PdaFeedbackTone.Success,
            )
        }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
        return true
    }

    fun submitCurrentLine() {
        val state = _uiState.value
        val batch = state.selectedBatch
        val detail = state.selectedDetail
        val countedQuantity = state.quantityInput.trim().toIntOrNull()

        if (batch == null) {
            showBusinessError(context.getString(R.string.inventory_count_error_batch_required))
            return
        }
        if (detail == null) {
            showBusinessError(context.getString(R.string.inventory_count_error_detail_required))
            return
        }
        if (countedQuantity == null || countedQuantity < 0) {
            showBusinessError(context.getString(R.string.inventory_count_error_quantity_invalid))
            return
        }
        val targetBatch = batch
        val targetDetail = detail
        val targetQuantity = countedQuantity

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    submitAction = PdaActionState.Running,
                    feedbackMessage = null,
                )
            }

            repository.submitScopeLine(
                orderId = targetBatch.orderId,
                request = SubmitInventoryCountLineRequest(
                    countedQuantity = targetQuantity,
                    scope = detailScope(targetDetail),
                    roundType = if (targetBatch.batchType == "RECOUNT") "RECOUNT" else "FIRST",
                    scanPayload = mapOf(
                        "locationCode" to state.targetLocationCode.trim(),
                        "skuOrBarcode" to state.skuInput.trim(),
                        "detailNumber" to targetDetail.detailNumber,
                        "source" to "PDA",
                    )
                )
            )
                .onSuccess { result ->
                    val submittedLocationCode = state.targetLocationCode.trim()
                    val remainingForLocation = result.details.count { nextDetail ->
                        nextDetail.locationCode.equals(submittedLocationCode, ignoreCase = true) &&
                            isInventoryCountDetailPending(result.batch.batchType, nextDetail.status)
                    }
                    val nextLocationCode = if (remainingForLocation > 0) {
                        submittedLocationCode
                    } else {
                        nextPendingLocationCode(result.batch, result.details, submittedLocationCode)
                    }
                    if (nextLocationCode.isBlank() || !isExecutableBatchStatus(result.batch.status)) {
                        handleBatchFinishedAfterSubmit(targetBatch.orderId)
                        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                        return@onSuccess
                    }

                    _uiState.update {
                        it.copy(
                            submitAction = PdaActionState.Success,
                            selectedBatch = result.batch,
                            details = result.details,
                            targetLocationCode = nextLocationCode,
                            locationInput = if (remainingForLocation > 0) submittedLocationCode else "",
                            locationConfirmed = remainingForLocation > 0,
                            skuInput = "",
                            quantityInput = "",
                            selectedDetailId = "",
                            feedbackMessage = if (remainingForLocation > 0) {
                                context.getString(R.string.inventory_count_feedback_submit_success_remaining, remainingForLocation)
                            } else if (nextLocationCode.isNotBlank()) {
                                context.getString(R.string.inventory_count_feedback_submit_success_next_location, nextLocationCode)
                            } else {
                                context.getString(R.string.inventory_count_feedback_submit_success_location_done)
                            },
                            feedbackTone = PdaFeedbackTone.Success,
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            submitAction = PdaActionState.Error,
                            feedbackMessage = error.message ?: context.getString(R.string.inventory_count_error_submit_failed),
                            feedbackTone = PdaFeedbackTone.Error,
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    private suspend fun handleBatchFinishedAfterSubmit(orderId: String) {
        repository.loadBatches()
            .onSuccess { batches ->
                val nextBatch = batches.firstOrNull { it.orderId == orderId }
                if (nextBatch != null) {
                    _uiState.update {
                        it.copy(
                            batches = batches,
                            submitAction = PdaActionState.Idle,
                        )
                    }
                    openBatchForWork(
                        nextBatch,
                        context.getString(R.string.inventory_count_feedback_complete_success)
                    )
                    return@onSuccess
                }

                _uiState.update {
                    it.copy(
                        phase = InventoryCountPhase.List,
                        submitAction = PdaActionState.Success,
                        batches = batches,
                        selectedBatch = null,
                        details = emptyList(),
                        targetLocationCode = "",
                        locationInput = "",
                        locationConfirmed = false,
                        skuInput = "",
                        quantityInput = "",
                        selectedDetailId = "",
                        feedbackMessage = context.getString(R.string.inventory_count_feedback_complete_success),
                        feedbackTone = PdaFeedbackTone.Success,
                    )
                }
            }
            .onFailure { error ->
                _uiState.update {
                    it.copy(
                        phase = InventoryCountPhase.List,
                        submitAction = PdaActionState.Error,
                        selectedBatch = null,
                        details = emptyList(),
                        targetLocationCode = "",
                        locationInput = "",
                        locationConfirmed = false,
                        skuInput = "",
                        quantityInput = "",
                        selectedDetailId = "",
                        feedbackMessage = error.message ?: context.getString(R.string.inventory_count_error_load_batches),
                        feedbackTone = PdaFeedbackTone.Error,
                    )
                }
            }
    }

    fun completeBatch() {
        val state = _uiState.value
        val batch = state.selectedBatch
        if (batch == null) {
            showBusinessError(context.getString(R.string.inventory_count_error_batch_required))
            return
        }
        if (state.pendingDetailCount > 0) {
            showBusinessError(context.getString(R.string.inventory_count_error_complete_pending, state.pendingDetailCount))
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    completeAction = PdaActionState.Running,
                    feedbackMessage = null,
                )
            }

            repository.completeBatch(batch.orderId, batch.batchId)
                .onSuccess {
                    repository.loadBatches()
                        .onSuccess { batches ->
                            val nextBatch = batches.firstOrNull { it.orderId == batch.orderId }
                            if (nextBatch != null) {
                                _uiState.update {
                                    it.copy(
                                        batches = batches,
                                        completeAction = PdaActionState.Idle,
                                    )
                                }
                                openBatchForWork(
                                    nextBatch,
                                    context.getString(R.string.inventory_count_feedback_next_location_loaded)
                                )
                            } else {
                                _uiState.update {
                                    it.copy(
                                        phase = InventoryCountPhase.List,
                                        completeAction = PdaActionState.Success,
                                        batches = batches,
                                        selectedBatch = null,
                                        details = emptyList(),
                                        targetLocationCode = "",
                                        locationInput = "",
                                        locationConfirmed = false,
                                        skuInput = "",
                                        quantityInput = "",
                                        selectedDetailId = "",
                                        feedbackMessage = context.getString(R.string.inventory_count_feedback_complete_success),
                                        feedbackTone = PdaFeedbackTone.Success,
                                    )
                                }
                            }
                        }
                        .onFailure { error ->
                            _uiState.update {
                                it.copy(
                                    phase = InventoryCountPhase.List,
                                    completeAction = PdaActionState.Error,
                                    selectedBatch = null,
                                    details = emptyList(),
                                    targetLocationCode = "",
                                    locationInput = "",
                                    locationConfirmed = false,
                                    skuInput = "",
                                    quantityInput = "",
                                    selectedDetailId = "",
                                    feedbackMessage = error.message ?: context.getString(R.string.inventory_count_error_load_batches),
                                    feedbackTone = PdaFeedbackTone.Error,
                                )
                            }
                        }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            completeAction = PdaActionState.Error,
                            feedbackMessage = error.message ?: context.getString(R.string.inventory_count_error_complete_failed),
                            feedbackTone = PdaFeedbackTone.Error,
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    private suspend fun openBatchForWork(batch: InventoryCountBatchSummary, feedbackMessage: String) {
        _uiState.update {
            it.copy(
                isLoadingDetail = true,
                completeAction = PdaActionState.Idle,
                selectedBatch = batch,
                feedbackMessage = null,
            )
        }

        val result = if (batch.status == "READY") {
            repository.startBatch(batch.orderId, batch.batchId)
        } else {
            repository.loadBatchDetail(batch.orderId, batch.batchId)
        }

        result
            .onSuccess { detail ->
                val firstLocationCode = nextPendingLocationCode(detail.batch, detail.details)
                _uiState.update {
                    it.copy(
                        phase = InventoryCountPhase.Work,
                        isLoadingDetail = false,
                        selectedBatch = detail.batch,
                        details = detail.details,
                        targetLocationCode = firstLocationCode,
                        locationInput = "",
                        locationConfirmed = false,
                        skuInput = "",
                        quantityInput = "",
                        selectedDetailId = "",
                        feedbackMessage = feedbackMessage,
                        feedbackTone = PdaFeedbackTone.Success,
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
            }
            .onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoadingDetail = false,
                        feedbackMessage = error.message ?: context.getString(R.string.inventory_count_error_load_detail),
                        feedbackTone = PdaFeedbackTone.Error,
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.SystemError))
            }
    }

    private fun showBusinessError(message: String) {
        _uiState.update {
            it.copy(
                feedbackMessage = message,
                feedbackTone = PdaFeedbackTone.Error,
            )
        }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
    }

    private fun showSkuScanError(message: String) {
        _uiState.update {
            it.copy(
                skuInput = "",
                quantityInput = "",
                selectedDetailId = "",
                feedbackMessage = message,
                feedbackTone = PdaFeedbackTone.Error,
            )
        }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
    }
}
