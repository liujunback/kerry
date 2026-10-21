package com.kec.wms.pda.presentation.login

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.UserWarehouseBinding
import com.kec.wms.pda.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class WarehouseSelectionUiState(
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val warehouses: List<UserWarehouseBinding> = emptyList(),
    val selectedWarehouseId: String = "",
    val error: String? = null,
    val completedWarehouseId: String? = null
)

@HiltViewModel
class WarehouseSelectionViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(WarehouseSelectionUiState())
    val uiState: StateFlow<WarehouseSelectionUiState> = _uiState.asStateFlow()

    init {
        loadWarehouses()
    }

    fun loadWarehouses() {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true,
                    isSubmitting = false,
                    error = null,
                    completedWarehouseId = null
                )
            }

            val result = authRepository.getCurrentUser()
            result
                .onSuccess { userInfo ->
                    val warehouses = userInfo.warehouseBindings.orEmpty()
                    when {
                        warehouses.isEmpty() -> {
                            authRepository.saveWarehouseId(null)
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    warehouses = emptyList(),
                                    selectedWarehouseId = "",
                                    error = context.getString(R.string.login_select_warehouse_empty)
                                )
                            }
                        }

                        warehouses.size == 1 -> {
                            val warehouseId = warehouses.first().warehouseId
                            authRepository.saveWarehouseId(warehouseId)
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    warehouses = warehouses,
                                    selectedWarehouseId = warehouseId,
                                    completedWarehouseId = warehouseId
                                )
                            }
                        }

                        else -> {
                            authRepository.saveWarehouseId(null)
                            _uiState.update {
                                it.copy(
                                    isLoading = false,
                                    warehouses = warehouses,
                                    selectedWarehouseId = "",
                                    error = null
                                )
                            }
                        }
                    }
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            isSubmitting = false,
                            error = throwable.message
                                ?: context.getString(R.string.login_select_warehouse_load_failed)
                        )
                    }
                }
        }
    }

    fun updateSelectedWarehouse(warehouseId: String) {
        _uiState.update {
            it.copy(
                selectedWarehouseId = warehouseId,
                error = null
            )
        }
    }

    fun confirmSelection() {
        val selectedWarehouseId = _uiState.value.selectedWarehouseId
        if (selectedWarehouseId.isBlank()) {
            _uiState.update {
                it.copy(error = context.getString(R.string.login_select_warehouse_required))
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }
            authRepository.saveWarehouseId(selectedWarehouseId)
            _uiState.update {
                it.copy(
                    isSubmitting = false,
                    completedWarehouseId = selectedWarehouseId
                )
            }
        }
    }
}
