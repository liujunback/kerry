package com.kec.wms.pda.presentation.checkout

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.repository.AuthRepository
import com.kec.wms.pda.data.model.CheckoutScanResult
import com.kec.wms.pda.data.model.CheckoutWorkspace
import com.kec.wms.pda.data.model.CheckoutRecordSummary
import com.kec.wms.pda.domain.usecase.ConfirmCheckoutUseCase
import com.kec.wms.pda.domain.usecase.ScanCheckoutOrderUseCase
import com.kec.wms.pda.domain.usecase.ValidateCheckoutContainerUseCase
import com.kec.wms.pda.presentation.common.PdaActionState
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import com.kec.wms.pda.presentation.common.PdaUiEvent
import com.kec.wms.pda.presentation.common.runPdaAction
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CheckoutUiState(
    val checkoutType: String = "PALLET",
    val warehouseId: String = "",
    val workspaceId: String? = null,
    val containerNumber: String = "",
    val status: String = "",
    val channelName: String? = null,
    val orderCount: Int = 0,
    val parcelCount: Int = 0,
    val records: List<CheckoutRecordSummary> = emptyList(),
    val isLoading: Boolean = false,
    val isScanning: Boolean = false,
    val confirmAction: PdaActionState = PdaActionState.Idle,
    val error: String? = null,
    val successMessage: String? = null,
    val confirmedNumber: String? = null
)

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val validateCheckoutContainerUseCase: ValidateCheckoutContainerUseCase,
    private val scanCheckoutOrderUseCase: ScanCheckoutOrderUseCase,
    private val confirmCheckoutUseCase: ConfirmCheckoutUseCase,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(CheckoutUiState())
    val uiState: StateFlow<CheckoutUiState> = _uiState.asStateFlow()
    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    init {
        _uiState.update {
            it.copy(warehouseId = authRepository.getWarehouseId())
        }
    }

    fun updateCheckoutType(type: String) {
        _uiState.update {
            it.copy(checkoutType = type, error = null, successMessage = null)
        }
    }

    fun updateWarehouseId(warehouseId: String) {
        _uiState.update { it.copy(warehouseId = warehouseId, error = null) }
    }

    fun openContainer(containerNumber: String) {
        if (containerNumber.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.checkout_error_container_required)) }
            return
        }

        viewModelScope.launch {
            openContainerInternal(
                containerNumber = containerNumber.trim(),
                showSuccessMessage = true
            )
        }
    }

    fun submitCheckout(containerNumber: String, scannedNumber: String) {
        val normalizedContainer = containerNumber.trim()
        val normalizedScannedNumber = scannedNumber.trim()

        if (normalizedContainer.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.checkout_error_container_required)) }
            return
        }
        if (normalizedScannedNumber.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.checkout_error_scan_required)) }
            return
        }

        viewModelScope.launch {
            val currentState = _uiState.value
            val workspaceId = when {
                currentState.workspaceId.isNullOrBlank() -> {
                    openContainerInternal(
                        containerNumber = normalizedContainer,
                        showSuccessMessage = false
                    ).getOrNull()?.id ?: return@launch
                }

                currentState.containerNumber != normalizedContainer -> {
                    openContainerInternal(
                        containerNumber = normalizedContainer,
                        showSuccessMessage = false
                    ).getOrNull()?.id ?: return@launch
                }

                else -> currentState.workspaceId
            }

            scanOrderInternal(
                workspaceId = workspaceId,
                scannedNumber = normalizedScannedNumber
            )
        }
    }

    fun scanOrder(scannedNumber: String) {
        val workspaceId = _uiState.value.workspaceId
        if (workspaceId.isNullOrBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.checkout_error_scan_container_first)) }
            return
        }
        if (scannedNumber.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.checkout_error_scan_required)) }
            return
        }

        viewModelScope.launch {
            scanOrderInternal(
                workspaceId = workspaceId,
                scannedNumber = scannedNumber.trim()
            )
        }
    }

    fun confirmCheckout() {
        val workspaceId = _uiState.value.workspaceId
        if (workspaceId.isNullOrBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.checkout_error_open_container_first)) }
            return
        }

        viewModelScope.launch {
            runPdaAction(
                stateFlow = _uiState,
                onStart = {
                    it.copy(
                        confirmAction = PdaActionState.Running,
                        error = null,
                        successMessage = null
                    )
                },
                action = {
                    confirmCheckoutUseCase(
                        checkoutOrderId = workspaceId,
                        checkoutType = _uiState.value.checkoutType
                    )
                },
                onSuccess = { current, result ->
                    current.copy(
                        confirmAction = PdaActionState.Success,
                        status = "CHECKED_OUT",
                        confirmedNumber = result.checkoutNumber,
                        successMessage = context.getString(
                            R.string.checkout_success_completed_format,
                            result.checkoutNumber
                        )
                    )
                },
                onFailure = { current, error ->
                    current.copy(
                        confirmAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.checkout_error_complete_failed)
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

    fun resetWorkspace() {
        _uiState.value = CheckoutUiState(
            checkoutType = _uiState.value.checkoutType,
            warehouseId = _uiState.value.warehouseId
        )
    }

    private suspend fun openContainerInternal(
        containerNumber: String,
        showSuccessMessage: Boolean
    ): Result<CheckoutWorkspace> {
        _uiState.update {
            it.copy(
                isLoading = true,
                error = null,
                successMessage = null,
                confirmedNumber = null
            )
        }

        return validateCheckoutContainerUseCase(
            containerNumber = containerNumber,
            checkoutType = _uiState.value.checkoutType,
            warehouseId = _uiState.value.warehouseId.ifBlank { null }
        ).onSuccess { workspace ->
            _uiState.update {
                it.copy(
                    isLoading = false,
                    workspaceId = workspace.id,
                    containerNumber = workspace.containerNumber,
                    status = workspace.status,
                    channelName = workspace.channelName,
                    orderCount = workspace.orderCount,
                    parcelCount = workspace.parcelCount,
                    records = workspace.records,
                    successMessage = if (showSuccessMessage) {
                        context.getString(R.string.checkout_success_container_ready)
                    } else {
                        null
                    }
                )
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
        }.onFailure { error ->
            _uiState.update {
                it.copy(
                    isLoading = false,
                    error = error.message ?: context.getString(R.string.checkout_error_open_failed)
                )
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
        }
    }

    private suspend fun scanOrderInternal(
        workspaceId: String,
        scannedNumber: String
    ): Result<CheckoutScanResult> {
        _uiState.update {
            it.copy(
                isScanning = true,
                error = null,
                successMessage = null
            )
        }

        return scanCheckoutOrderUseCase(
            checkoutOrderId = workspaceId,
            scannedNumber = scannedNumber,
            checkoutType = _uiState.value.checkoutType
        ).onSuccess { result ->
            _uiState.update {
                it.copy(
                    isScanning = false,
                    records = listOf(result.record) + it.records,
                    orderCount = result.orderCount,
                    parcelCount = result.parcelCount,
                    successMessage = context.getString(
                        R.string.checkout_success_scan_format,
                        result.record.scannedNumber
                    )
                )
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
        }.onFailure { error ->
            _uiState.update {
                it.copy(
                    isScanning = false,
                    error = error.message ?: context.getString(R.string.checkout_error_scan_failed)
                )
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
        }
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
