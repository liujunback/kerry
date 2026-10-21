package com.kec.wms.pda.presentation.manifest

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.ManifestMountRecordSummary
import com.kec.wms.pda.data.model.ManifestMountWorkspace
import com.kec.wms.pda.domain.usecase.ConfirmManifestUseCase
import com.kec.wms.pda.domain.usecase.ScanManifestCheckoutUseCase
import com.kec.wms.pda.domain.usecase.ValidateManifestUseCase
import com.kec.wms.pda.presentation.common.PdaActionState
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import com.kec.wms.pda.presentation.common.PdaUiEvent
import com.kec.wms.pda.presentation.common.runPdaAction
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

data class ManifestMountUiState(
    val manifestOrderId: String? = null,
    val manifestNumber: String = "",
    val warehouseName: String? = null,
    val channelName: String? = null,
    val status: String = "",
    val containerCount: Int = 0,
    val orderCount: Int = 0,
    val parcelCount: Int = 0,
    val records: List<ManifestMountRecordSummary> = emptyList(),
    val isLoading: Boolean = false,
    val isScanning: Boolean = false,
    val confirmAction: PdaActionState = PdaActionState.Idle,
    val error: String? = null,
    val successMessage: String? = null
)

@HiltViewModel
class ManifestMountViewModel @Inject constructor(
    private val validateManifestUseCase: ValidateManifestUseCase,
    private val scanManifestCheckoutUseCase: ScanManifestCheckoutUseCase,
    private val confirmManifestUseCase: ConfirmManifestUseCase,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(ManifestMountUiState())
    val uiState: StateFlow<ManifestMountUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun validateManifest(manifestNumber: String) {
        val normalizedManifestNumber = manifestNumber.trim()
        if (normalizedManifestNumber.isBlank()) {
            _uiState.update {
                it.copy(error = context.getString(R.string.manifest_mount_error_manifest_required))
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    error = null,
                    successMessage = null
                )
            }

            validateManifestUseCase(normalizedManifestNumber)
                .onSuccess { workspace ->
                    applyWorkspace(workspace)
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            successMessage = context.getString(R.string.manifest_mount_success_manifest_ready)
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = error.message ?: context.getString(R.string.manifest_mount_error_validate_failed)
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
        }
    }

    fun scanCheckout(checkoutNumber: String) {
        val manifestOrderId = _uiState.value.manifestOrderId
        if (manifestOrderId.isNullOrBlank()) {
            _uiState.update {
                it.copy(error = context.getString(R.string.manifest_mount_error_scan_manifest_first))
            }
            return
        }

        val normalizedCheckoutNumber = checkoutNumber.trim()
        if (normalizedCheckoutNumber.isBlank()) {
            _uiState.update {
                it.copy(error = context.getString(R.string.manifest_mount_error_checkout_required))
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isScanning = true,
                    error = null,
                    successMessage = null
                )
            }

            scanManifestCheckoutUseCase(
                manifestOrderId = manifestOrderId,
                checkoutNumber = normalizedCheckoutNumber
            ).onSuccess { result ->
                _uiState.update {
                    it.copy(
                        isScanning = false,
                        containerCount = result.totalContainerCount,
                        orderCount = result.totalOrderCount,
                        parcelCount = result.totalParcelCount,
                        records = listOf(result.record) + it.records,
                        successMessage = context.getString(
                            R.string.manifest_mount_success_scan_format,
                            result.record.checkoutNumber
                        )
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isScanning = false,
                        error = error.message ?: context.getString(R.string.manifest_mount_error_scan_failed)
                    )
                }
                _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
            }
        }
    }

    fun confirmManifest() {
        val state = _uiState.value
        val manifestOrderId = state.manifestOrderId
        if (manifestOrderId.isNullOrBlank()) {
            _uiState.update {
                it.copy(error = context.getString(R.string.manifest_mount_error_open_manifest_first))
            }
            return
        }

        if (state.records.isEmpty()) {
            _uiState.update {
                it.copy(error = context.getString(R.string.manifest_mount_error_no_records))
            }
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
                action = { confirmManifestUseCase(manifestOrderId) },
                onSuccess = { _, result ->
                    ManifestMountUiState(
                        confirmAction = PdaActionState.Success,
                        successMessage = context.getString(
                            R.string.manifest_mount_success_completed_format,
                            result.manifestNumber
                        )
                    )
                },
                onFailure = { current, error ->
                    current.copy(
                        confirmAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.manifest_mount_error_confirm_failed)
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
        _uiState.value = ManifestMountUiState()
    }

    private fun applyWorkspace(workspace: ManifestMountWorkspace) {
        _uiState.update {
            it.copy(
                manifestOrderId = workspace.id,
                manifestNumber = workspace.manifestNumber,
                warehouseName = workspace.warehouseName,
                channelName = workspace.channelName,
                status = workspace.status,
                containerCount = workspace.containerCount,
                orderCount = workspace.orderCount,
                parcelCount = workspace.parcelCount,
                records = workspace.records
            )
        }
    }

    private fun resolveErrorSound(message: String?): PdaSoundEvent {
        val normalized = message.orEmpty()
        return if (
            normalized.contains("超时") ||
            normalized.contains("无法连接") ||
            normalized.contains("Unauthorized", ignoreCase = true) ||
            normalized.contains("Forbidden", ignoreCase = true) ||
            normalized.contains("登录")
        ) {
            PdaSoundEvent.SystemError
        } else {
            PdaSoundEvent.BusinessError
        }
    }
}
