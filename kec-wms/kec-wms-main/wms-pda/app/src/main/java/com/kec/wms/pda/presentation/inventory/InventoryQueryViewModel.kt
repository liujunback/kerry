package com.kec.wms.pda.presentation.inventory

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.InventoryQueryItem
import com.kec.wms.pda.data.repository.InventoryRepository
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

data class InventoryQueryUiState(
    val skuOrBarcode: String = "",
    val locationCode: String = "",
    val isLoading: Boolean = false,
    val results: List<InventoryQueryItem> = emptyList(),
    val feedbackMessage: String? = null,
    val feedbackTone: PdaFeedbackTone = PdaFeedbackTone.Error,
)

@HiltViewModel
class InventoryQueryViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(InventoryQueryUiState())
    val uiState: StateFlow<InventoryQueryUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun reset() {
        _uiState.value = InventoryQueryUiState()
    }

    fun updateSkuOrBarcode(value: String) {
        _uiState.update { current ->
            val hasChanged = current.skuOrBarcode.trim() != value.trim()
            current.copy(
                skuOrBarcode = value,
                results = if (hasChanged) emptyList() else current.results,
                feedbackMessage = null
            )
        }
    }

    fun updateLocationCode(value: String) {
        _uiState.update { current ->
            val hasChanged = current.locationCode.trim() != value.trim()
            current.copy(
                locationCode = value,
                results = if (hasChanged) emptyList() else current.results,
                feedbackMessage = null
            )
        }
    }

    fun search() {
        val state = _uiState.value
        val skuOrBarcode = state.skuOrBarcode.trim()
        val locationCode = state.locationCode.trim()

        if (skuOrBarcode.isBlank() && locationCode.isBlank()) {
            showError(context.getString(R.string.inventory_query_error_criteria_required))
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    feedbackMessage = null
                )
            }

            inventoryRepository.lookupInventoryQuery(locationCode, skuOrBarcode)
                .onSuccess { result ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            results = result.items,
                            feedbackMessage = null
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            results = emptyList(),
                            feedbackMessage = error.message ?: context.getString(R.string.inventory_error_lookup_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(error.message)))
                }
        }
    }

    private fun showError(message: String) {
        _uiState.update {
            it.copy(
                feedbackMessage = message,
                feedbackTone = PdaFeedbackTone.Error
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
