package com.kec.wms.pda.presentation.receiving

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import android.content.Context
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.AsnDetail
import com.kec.wms.pda.data.model.AsnLine
import com.kec.wms.pda.data.model.AvailableBatchLineOption
import com.kec.wms.pda.data.model.ContainerCloseResult
import com.kec.wms.pda.data.model.ReceivingRequest
import com.kec.wms.pda.data.model.SkuInfo
import com.kec.wms.pda.domain.usecase.CaptureFirstReceivingUseCase
import com.kec.wms.pda.domain.usecase.CloseReceivingContainerUseCase
import com.kec.wms.pda.domain.usecase.LoadAsnUseCase
import com.kec.wms.pda.domain.usecase.LookupReceivingSkuUseCase
import com.kec.wms.pda.domain.usecase.OpenReceivingContainerUseCase
import com.kec.wms.pda.domain.usecase.SubmitReceivingUseCase
import com.kec.wms.pda.presentation.common.PdaActionState
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import com.kec.wms.pda.presentation.common.PdaUiEvent
import com.kec.wms.pda.presentation.common.runPdaAction
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

const val RECEIVING_MODE_SKU = "SKU"
const val RECEIVING_MODE_CONTAINER = "CONTAINER"
private const val QUALITY_GOOD = "GOOD"
private const val QUALITY_DAMAGED = "DAMAGED"
private const val CONTAINER_TYPE_INTERNAL_MANAGED = "INTERNAL_MANAGED"

data class ReceivingUiState(
    val receivingMode: String = RECEIVING_MODE_SKU,
    val isLoading: Boolean = false,
    val submitAction: PdaActionState = PdaActionState.Idle,
    val isCapturingFirstReceiving: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null,
    val asnDetail: AsnDetail? = null,
    val asnNumber: String = "",
    val containerCode: String = "",
    val containerId: String? = null,
    val containerHasPendingClose: Boolean = false,
    val containerBatchNumber: String? = null,
    val containerExpiryDate: String? = null,
    val skuCode: String = "",
    val currentSku: SkuInfo? = null,
    val matchedLine: AsnLine? = null,
    val availableBatchLines: List<AvailableBatchLineOption> = emptyList(),
    val selectedBatchLineId: String? = null,
    val skuRefocusVersion: Int = 0,
    val remainingQty: Int = 0,
    val receivedQty: String = "",
    val qualityStatus: String = QUALITY_GOOD,
    val batchNumber: String = "",
    val expiryDate: String = "",
    val showFirstReceivingDialog: Boolean = false
)

@HiltViewModel
class ReceivingViewModel @Inject constructor(
    private val loadAsnUseCase: LoadAsnUseCase,
    private val lookupReceivingSkuUseCase: LookupReceivingSkuUseCase,
    private val openReceivingContainerUseCase: OpenReceivingContainerUseCase,
    private val closeReceivingContainerUseCase: CloseReceivingContainerUseCase,
    private val captureFirstReceivingUseCase: CaptureFirstReceivingUseCase,
    private val submitReceivingUseCase: SubmitReceivingUseCase,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReceivingUiState())
    val uiState: StateFlow<ReceivingUiState> = _uiState.asStateFlow()
    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun enterMode(mode: String) {
        _uiState.value = ReceivingUiState(receivingMode = mode)
    }

    fun updateAsnNumber(value: String) {
        _uiState.update {
            if (value == it.asnNumber) {
                it.copy(error = null, successMessage = null)
            } else {
                ReceivingUiState(
                    receivingMode = it.receivingMode,
                    asnNumber = value
                )
            }
        }
    }

    fun updateContainerCode(value: String) {
        _uiState.update {
            val trimmedCurrent = it.containerCode.trim()
            val trimmedNext = value.trim()
            if (trimmedCurrent == trimmedNext &&
                value == it.containerCode &&
                it.containerId == null
            ) {
                it.copy(error = null, successMessage = null)
            } else {
                it.copy(
                    containerCode = value,
                    containerId = if (trimmedCurrent == trimmedNext) it.containerId else null,
                    containerHasPendingClose = if (trimmedCurrent == trimmedNext) it.containerHasPendingClose else false,
                    containerBatchNumber = if (trimmedCurrent == trimmedNext) it.containerBatchNumber else null,
                    containerExpiryDate = if (trimmedCurrent == trimmedNext) it.containerExpiryDate else null,
                    currentSku = if (trimmedCurrent == trimmedNext) it.currentSku else null,
                    matchedLine = if (trimmedCurrent == trimmedNext) it.matchedLine else null,
                    availableBatchLines = if (trimmedCurrent == trimmedNext) it.availableBatchLines else emptyList(),
                    selectedBatchLineId = if (trimmedCurrent == trimmedNext) it.selectedBatchLineId else null,
                    remainingQty = if (trimmedCurrent == trimmedNext) it.remainingQty else 0,
                    skuCode = if (trimmedCurrent == trimmedNext) it.skuCode else "",
                    receivedQty = if (trimmedCurrent == trimmedNext) it.receivedQty else "",
                    qualityStatus = if (trimmedCurrent == trimmedNext) it.qualityStatus else QUALITY_GOOD,
                    batchNumber = if (trimmedCurrent == trimmedNext) it.batchNumber else "",
                    expiryDate = if (trimmedCurrent == trimmedNext) it.expiryDate else "",
                    showFirstReceivingDialog = false,
                    error = null,
                    successMessage = null
                )
            }
        }
    }

    fun updateSkuCode(value: String) {
        _uiState.update {
            if (value.isBlank()) {
                it.copy(
                    skuCode = "",
                    currentSku = null,
                    matchedLine = null,
                    availableBatchLines = emptyList(),
                    selectedBatchLineId = null,
                    remainingQty = 0,
                    receivedQty = "",
                    qualityStatus = QUALITY_GOOD,
                    batchNumber = if (it.receivingMode == RECEIVING_MODE_CONTAINER) {
                        it.containerBatchNumber.orEmpty()
                    } else {
                        ""
                    },
                    expiryDate = if (it.receivingMode == RECEIVING_MODE_CONTAINER) {
                        it.containerExpiryDate.orEmpty()
                    } else {
                        ""
                    },
                    showFirstReceivingDialog = false,
                    error = null,
                    successMessage = null
                )
            } else {
                it.copy(skuCode = value, error = null, successMessage = null)
            }
        }
    }

    fun updateReceivedQty(value: String) {
        _uiState.update { it.copy(receivedQty = value, error = null, successMessage = null) }
    }

    fun updateQualityStatus(status: String) {
        _uiState.update { it.copy(qualityStatus = status, error = null, successMessage = null) }
    }

    fun selectBatchLine(batchLineId: String) {
        val state = _uiState.value
        val batchLine = state.availableBatchLines.firstOrNull { it.id == batchLineId } ?: return
        val detail = state.asnDetail ?: return
        val matchedLine = detail.asnLines?.firstOrNull { it.id == batchLine.id } ?: state.matchedLine

        _uiState.update {
            it.copy(
                selectedBatchLineId = batchLine.id,
                matchedLine = matchedLine,
                batchNumber = batchLine.batchNumber.orEmpty(),
                expiryDate = normalizeDate(batchLine.expiryDate),
                remainingQty = batchLine.remainingQty,
                receivedQty = ""
            )
        }
    }

    fun updateExpiryDate(value: String) {
        _uiState.update { it.copy(expiryDate = value, error = null, successMessage = null) }
    }

    fun loadAsn(asnNumber: String = _uiState.value.asnNumber) {
        val normalizedAsn = asnNumber.trim()
        if (normalizedAsn.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.asn_sign_in_asn_required)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        viewModelScope.launch {
            _uiState.update {
                ReceivingUiState(
                    receivingMode = it.receivingMode,
                    isLoading = true,
                    asnNumber = normalizedAsn
                )
            }

            loadAsnUseCase(normalizedAsn, _uiState.value.receivingMode)
                .onSuccess { asnDetail ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            asnDetail = asnDetail,
                            asnNumber = asnDetail.asnNumber,
                            error = null,
                            successMessage = null
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: context.getString(R.string.receiving_asn_load_failed),
                            successMessage = null
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
        }
    }

    fun scanContainer(containerCode: String = _uiState.value.containerCode) {
        val state = _uiState.value
        val asnDetail = state.asnDetail
        if (asnDetail == null) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_scan_asn_first)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        val normalizedContainer = containerCode.trim()
        if (normalizedContainer.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_container_required)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    containerCode = normalizedContainer,
                    error = null,
                    successMessage = null
                )
            }

            openReceivingContainerUseCase(
                containerCode = normalizedContainer,
                warehouseId = asnDetail.warehouseId,
                asnId = asnDetail.id
            ).onSuccess { container ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        containerCode = container.containerCode,
                        containerId = container.id,
                        containerHasPendingClose = false,
                        error = null,
                        successMessage = context.getString(R.string.receiving_container_ready)
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        containerId = null,
                        containerBatchNumber = null,
                        containerExpiryDate = null,
                        error = error.message ?: context.getString(R.string.receiving_container_open_failed),
                        successMessage = null
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
            }
        }
    }

    fun clearContainer() {
        _uiState.update {
            it.copy(
                containerCode = "",
                containerId = null,
                containerHasPendingClose = false,
                containerBatchNumber = null,
                containerExpiryDate = null,
                currentSku = null,
                matchedLine = null,
                availableBatchLines = emptyList(),
                selectedBatchLineId = null,
                remainingQty = 0,
                skuCode = "",
                receivedQty = "",
                qualityStatus = QUALITY_GOOD,
                batchNumber = "",
                expiryDate = "",
                error = null,
                successMessage = null,
                showFirstReceivingDialog = false
            )
        }
    }

    fun scanSku(skuCode: String = _uiState.value.skuCode) {
        val state = _uiState.value
        val asnDetail = state.asnDetail
        if (asnDetail == null) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_scan_asn_first)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (state.receivingMode == RECEIVING_MODE_CONTAINER && state.containerId.isNullOrBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_scan_container_first)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        val normalizedSku = skuCode.trim()
        if (normalizedSku.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_sku_required)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    skuCode = normalizedSku,
                    error = null,
                    successMessage = null
                )
            }

            lookupReceivingSkuUseCase(asnDetail.id, normalizedSku)
                .onSuccess { result ->
                    val remainingQty = (result.asnLine.expectedQty - result.asnLine.receivedQty).coerceAtLeast(0)
                    if (remainingQty <= 0) {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                skuCode = "",
                                error = context.getString(R.string.receiving_sku_completed),
                                successMessage = null,
                                skuRefocusVersion = it.skuRefocusVersion + 1
                            )
                        }
                        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                        return@onSuccess
                    }

                    val resolvedBatchNumber = if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                        state.containerBatchNumber.orEmpty().ifBlank { result.asnLine.batchNumber.orEmpty() }
                    } else {
                        result.asnLine.batchNumber.orEmpty()
                    }
                    val availableBatchLines = result.availableBatchLines.ifEmpty {
                        listOf(
                            AvailableBatchLineOption(
                                id = result.asnLine.id,
                                lineNumber = result.asnLine.lineNumber,
                                batchNumber = result.asnLine.batchNumber,
                                expiryDate = normalizeDate(result.asnLine.expiryDate),
                                expectedQty = result.asnLine.expectedQty,
                                receivedQty = result.asnLine.receivedQty,
                                remainingQty = remainingQty
                            )
                        )
                    }
                    val resolvedExpiryDate = if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                        state.containerExpiryDate.orEmpty().ifBlank { normalizeDate(result.asnLine.expiryDate) }
                    } else {
                        resolveSingleExpiryDate(availableBatchLines)
                    }

                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            skuCode = normalizedSku,
                            currentSku = result.sku,
                            matchedLine = result.asnLine,
                            availableBatchLines = availableBatchLines,
                            selectedBatchLineId = availableBatchLines.firstOrNull()?.id,
                            remainingQty = remainingQty,
                            receivedQty = "",
                            qualityStatus = QUALITY_GOOD,
                            batchNumber = resolvedBatchNumber,
                            expiryDate = resolvedExpiryDate,
                            showFirstReceivingDialog = result.sku.isFirstReceiving,
                            error = null,
                            successMessage = null
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            skuCode = "",
                            currentSku = null,
                            matchedLine = null,
                            availableBatchLines = emptyList(),
                            selectedBatchLineId = null,
                            remainingQty = 0,
                            error = error.message ?: context.getString(R.string.receiving_sku_lookup_failed),
                            successMessage = null,
                            showFirstReceivingDialog = false,
                            skuRefocusVersion = it.skuRefocusVersion + 1
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
        }
    }

    fun captureFirstReceiving(
        isSelfPackaged: Boolean,
        lengthCm: Double,
        widthCm: Double,
        heightCm: Double,
        weightKg: Double
    ) {
        val currentSku = _uiState.value.currentSku ?: return

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isCapturingFirstReceiving = true,
                    error = null,
                    successMessage = null
                )
            }

            captureFirstReceivingUseCase(
                skuId = currentSku.id,
                isSelfPackaged = isSelfPackaged,
                lengthCm = lengthCm,
                widthCm = widthCm,
                heightCm = heightCm,
                weightKg = weightKg
            ).onSuccess { updatedSku ->
                _uiState.update {
                    it.copy(
                        isCapturingFirstReceiving = false,
                        currentSku = updatedSku.copy(isFirstReceiving = false),
                        showFirstReceivingDialog = false,
                        error = null,
                        successMessage = context.getString(R.string.receiving_first_receiving_saved)
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isCapturingFirstReceiving = false,
                        error = error.message ?: context.getString(R.string.receiving_first_receiving_save_failed),
                        successMessage = null
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
            }
        }
    }

    fun submitReceiving() {
        val state = _uiState.value
        val asnDetail = state.asnDetail
        val matchedLine = state.matchedLine
        val currentSku = state.currentSku

        if (
            state.receivingMode == RECEIVING_MODE_CONTAINER &&
            state.containerHasPendingClose &&
            state.currentSku == null &&
            !state.containerId.isNullOrBlank()
        ) {
            closeContainerOnly(state.containerId)
            return
        }

        if (asnDetail == null) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_scan_asn_first)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (matchedLine == null || currentSku == null) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_scan_sku_first)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (state.receivingMode == RECEIVING_MODE_CONTAINER && state.containerId.isNullOrBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_scan_container_first)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (state.showFirstReceivingDialog || currentSku.isFirstReceiving) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_first_receiving_required)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        val qty = state.receivedQty.toIntOrNull()
        if (qty == null || qty <= 0) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_qty_invalid)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (qty > state.remainingQty) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_qty_exceeds_remaining)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (currentSku.isBatchManaged && state.batchNumber.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_batch_required)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (currentSku.isExpiryManaged && state.expiryDate.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.receiving_expiry_required)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        viewModelScope.launch {
            val shouldRememberBatch = state.receivingMode == RECEIVING_MODE_CONTAINER &&
                state.batchNumber.isNotBlank() &&
                state.containerBatchNumber.isNullOrBlank()
            val shouldRememberExpiry = state.receivingMode == RECEIVING_MODE_CONTAINER &&
                state.expiryDate.isNotBlank() &&
                state.containerExpiryDate.isNullOrBlank()

            runPdaAction(
                stateFlow = _uiState,
                onStart = {
                    it.copy(
                        submitAction = PdaActionState.Running,
                        error = null,
                        successMessage = null
                    )
                },
                action = {
                    submitReceivingUseCase(
                        asnId = asnDetail.id,
                        request = ReceivingRequest(
                            asnLineId = matchedLine.id,
                            receivedQty = qty,
                            qualityStatus = state.qualityStatus,
                            batchNumber = state.batchNumber.ifBlank { null },
                            expiryDate = state.expiryDate.ifBlank { null },
                            containerId = state.containerId,
                            containerCode = state.containerCode.ifBlank { null },
                            containerType = if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                                CONTAINER_TYPE_INTERNAL_MANAGED
                            } else {
                                null
                            },
                            receivingMode = state.receivingMode,
                            deviceType = "PDA"
                        )
                    )
                },
                onSuccess = { current, result ->
                    val rememberedBatchNumber = if (shouldRememberBatch) {
                        state.batchNumber
                    } else {
                        state.containerBatchNumber
                    }
                    val rememberedExpiryDate = if (shouldRememberExpiry) {
                        state.expiryDate
                    } else {
                        state.containerExpiryDate
                    }
                    current.copy(
                        submitAction = if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                            PdaActionState.Running
                        } else {
                            PdaActionState.Success
                        },
                        asnDetail = current.asnDetail?.let { detail ->
                            detail.copy(
                                totalReceivedQty = result.totalReceivedQty,
                                totalReceivedLines = result.totalReceivedLines,
                                status = result.newStatus,
                                asnLines = detail.asnLines?.map { line ->
                                    if (line.id == result.asnLine.id) {
                                        result.asnLine
                                    } else {
                                        line
                                    }
                                }
                            )
                        },
                        currentSku = null,
                        matchedLine = null,
                        availableBatchLines = emptyList(),
                        selectedBatchLineId = null,
                        remainingQty = 0,
                        skuCode = "",
                        receivedQty = "",
                        qualityStatus = QUALITY_GOOD,
                        batchNumber = if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                            rememberedBatchNumber.orEmpty()
                        } else {
                            ""
                        },
                        expiryDate = if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                            rememberedExpiryDate.orEmpty()
                        } else {
                            ""
                        },
                        containerBatchNumber = rememberedBatchNumber,
                        containerExpiryDate = rememberedExpiryDate,
                        containerHasPendingClose = false,
                        error = null,
                        successMessage = if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                            null
                        } else {
                            context.getString(R.string.receiving_save_success_format, qty)
                        }
                    )
                },
                onFailure = { current, error ->
                    current.copy(
                        submitAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.receiving_submit_failed),
                        successMessage = null
                    )
                },
                onSuccessEvent = {
                    if (state.receivingMode == RECEIVING_MODE_CONTAINER) {
                        closeContainerAfterSubmit(state.containerId)
                    } else {
                        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                    }
                },
                onFailureEvent = { error ->
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
            )
        }
    }

    private fun closeContainerAfterSubmit(containerId: String?) {
        if (containerId.isNullOrBlank()) {
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
            return
        }

        viewModelScope.launch {
            closeReceivingContainerUseCase(containerId)
                .onSuccess { result ->
                    handleContainerClosed(
                        result = result,
                        successMessage = context.getString(R.string.receiving_submit_close_success)
                    )
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            submitAction = PdaActionState.Error,
                            containerHasPendingClose = true,
                            error = error.message ?: context.getString(R.string.receiving_close_failed),
                            successMessage = context.getString(R.string.receiving_submit_saved_close_failed)
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
        }
    }

    private fun closeContainerOnly(containerId: String?) {
        if (containerId.isNullOrBlank()) return

        viewModelScope.launch {
            runPdaAction(
                stateFlow = _uiState,
                onStart = {
                    it.copy(
                        submitAction = PdaActionState.Running,
                        error = null,
                        successMessage = null
                    )
                },
                action = { closeReceivingContainerUseCase(containerId) },
                onSuccess = { current, result ->
                    buildContainerClosedState(
                        current = current,
                        result = result,
                        successMessage = context.getString(R.string.receiving_close_success)
                    )
                },
                onFailure = { current, error ->
                    current.copy(
                        submitAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.receiving_close_failed),
                        successMessage = null
                    )
                },
                onSuccessEvent = {
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                },
                onFailureEvent = { error ->
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
            )
        }
    }

    private fun handleContainerClosed(
        result: ContainerCloseResult,
        successMessage: String
    ) {
        _uiState.update { current ->
            buildContainerClosedState(
                current = current,
                result = result,
                successMessage = successMessage
            )
        }
    }

    private fun buildContainerClosedState(
        current: ReceivingUiState,
        result: ContainerCloseResult,
        successMessage: String
    ): ReceivingUiState {
        return current.copy(
            submitAction = PdaActionState.Success,
            asnDetail = if (result.asnUpdated) null else current.asnDetail,
            asnNumber = if (result.asnUpdated) "" else current.asnNumber,
            containerCode = "",
            containerId = null,
            containerHasPendingClose = false,
            containerBatchNumber = null,
            containerExpiryDate = null,
            currentSku = null,
            matchedLine = null,
            availableBatchLines = emptyList(),
            selectedBatchLineId = null,
            skuCode = "",
            remainingQty = 0,
            receivedQty = "",
            qualityStatus = QUALITY_GOOD,
            batchNumber = "",
            expiryDate = "",
            showFirstReceivingDialog = false,
            error = null,
            successMessage = if (result.asnUpdated) {
                context.getString(R.string.receiving_asn_completed)
            } else {
                successMessage
            }
        )
    }

    fun reset() {
        _uiState.value = ReceivingUiState()
    }

    private fun normalizeDate(rawValue: String?): String {
        if (rawValue.isNullOrBlank()) return ""
        return rawValue
            .substringBefore('T')
            .substringBefore(' ')
    }

    private fun resolveSingleExpiryDate(batchLines: List<AvailableBatchLineOption>): String {
        val expiryDates = batchLines
            .mapNotNull { normalizeDate(it.expiryDate).takeIf { value -> value.isNotBlank() } }
            .distinct()

        return expiryDates.singleOrNull().orEmpty()
    }

    private fun resolveErrorSound(message: String?): PdaSoundEvent {
        val normalized = message.orEmpty()
        return if (
            normalized.contains("超时") ||
            normalized.contains("无法连接") ||
            normalized.contains("Unauthorized", ignoreCase = true) ||
            normalized.contains("登录")
        ) {
            PdaSoundEvent.SystemError
        } else {
            PdaSoundEvent.BusinessError
        }
    }
}
