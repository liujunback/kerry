package com.kec.wms.pda.presentation.putaway

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.data.model.PutawayContainerInfo
import com.kec.wms.pda.data.model.PutawayContainerItem
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.PutawayLocation
import com.kec.wms.pda.data.model.PutawayOrderDetail
import com.kec.wms.pda.data.model.PutawaySubmitRequest
import com.kec.wms.pda.data.model.PutawayTask
import com.kec.wms.pda.domain.usecase.LoadPutawayOrderUseCase
import com.kec.wms.pda.domain.usecase.LookupPutawayContainerUseCase
import com.kec.wms.pda.domain.usecase.LookupPutawayLocationUseCase
import com.kec.wms.pda.domain.usecase.SubmitPutawayUseCase
import com.kec.wms.pda.presentation.common.PdaActionState
import com.kec.wms.pda.presentation.common.runPdaAction
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

const val PUTAWAY_MODE_SKU = "SKU"
const val PUTAWAY_MODE_CONTAINER = "CONTAINER"

data class PutawaySkuUiState(
    val putawayMode: String = PUTAWAY_MODE_SKU,
    val isLoading: Boolean = false,
    val submitAction: PdaActionState = PdaActionState.Idle,
    val orderInput: String = "",
    val skuInput: String = "",
    val order: PutawayOrderDetail? = null,
    val currentContainer: PutawayContainerInfo? = null,
    val currentContainerItem: PutawayContainerItem? = null,
    val matchedTasks: List<PutawayTask> = emptyList(),
    val selectedTaskIndex: Int = 0,
    val currentLocation: PutawayLocation? = null,
    val error: String? = null,
    val successMessage: String? = null,
)

@HiltViewModel
class PutawaySkuViewModel @Inject constructor(
    private val loadPutawayOrderUseCase: LoadPutawayOrderUseCase,
    private val lookupPutawayContainerUseCase: LookupPutawayContainerUseCase,
    private val lookupPutawayLocationUseCase: LookupPutawayLocationUseCase,
    private val submitPutawayUseCase: SubmitPutawayUseCase,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private data class PutawaySubmitOutcome(
        val quantity: Int,
        val refreshedOrder: PutawayOrderDetail?,
        val refreshErrorMessage: String?
    )

    private val _uiState = MutableStateFlow(PutawaySkuUiState())
    val uiState: StateFlow<PutawaySkuUiState> = _uiState.asStateFlow()

    fun enterMode(mode: String) {
        _uiState.value = PutawaySkuUiState(putawayMode = mode)
    }

    fun updateOrderInput(value: String) {
        _uiState.update { it.copy(orderInput = value, error = null, successMessage = null) }
    }

    fun updateSkuInput(value: String) {
        _uiState.update {
            val hasScanChanged = value.trim() != it.skuInput.trim()
            it.copy(
                skuInput = value,
                currentContainer = if (hasScanChanged) null else it.currentContainer,
                currentContainerItem = if (hasScanChanged) null else it.currentContainerItem,
                matchedTasks = if (value.isBlank() || hasScanChanged) emptyList() else it.matchedTasks,
                selectedTaskIndex = if (value.isBlank() || hasScanChanged) 0 else it.selectedTaskIndex,
                currentLocation = if (value.isBlank() || hasScanChanged) null else it.currentLocation,
                error = null,
                successMessage = null
            )
        }
    }

    fun clearCurrentLocation() {
        _uiState.update { it.copy(currentLocation = null, error = null) }
    }

    fun loadOrder() {
        val orderNumber = _uiState.value.orderInput.trim()
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, successMessage = null) }

            loadPutawayOrderUseCase(orderNumber)
                .onSuccess { order ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            order = order,
                            skuInput = "",
                            currentContainer = null,
                            currentContainerItem = null,
                            matchedTasks = emptyList(),
                            selectedTaskIndex = 0,
                            currentLocation = null,
                            error = null,
                            successMessage = null,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            order = null,
                            currentContainer = null,
                            currentContainerItem = null,
                            matchedTasks = emptyList(),
                            selectedTaskIndex = 0,
                            currentLocation = null,
                            error = error.message ?: context.getString(R.string.putaway_feedback_order_load_failed),
                            successMessage = null,
                        )
                    }
                }
        }
    }

    fun scanSku() {
        if (_uiState.value.putawayMode == PUTAWAY_MODE_CONTAINER) {
            scanContainer()
            return
        }

        scanSkuTask()
    }

    private fun scanSkuTask() {
        val state = _uiState.value
        val order = state.order
        if (order == null) {
            _uiState.update { it.copy(error = context.getString(R.string.putaway_feedback_order_required)) }
            return
        }

        val scanned = state.skuInput.trim()
        if (scanned.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.putaway_feedback_sku_required)) }
            return
        }

        val matchingTasks = order.putawayTasks.filter { task ->
            task.remainingQty > 0 && (
                task.skuCode.equals(scanned, ignoreCase = true) ||
                    (task.barcode?.equals(scanned, ignoreCase = true) == true)
                )
        }

        if (matchingTasks.isEmpty()) {
            _uiState.update {
                it.copy(
                    currentContainer = null,
                    currentContainerItem = null,
                    matchedTasks = emptyList(),
                    selectedTaskIndex = 0,
                    currentLocation = null,
                    error = context.getString(R.string.putaway_feedback_sku_not_in_order),
                    successMessage = null,
                )
            }
            return
        }

        _uiState.update {
            it.copy(
                currentContainer = null,
                currentContainerItem = null,
                matchedTasks = matchingTasks,
                selectedTaskIndex = 0,
                currentLocation = null,
                error = null,
                successMessage = null,
            )
        }
    }

    private fun scanContainer() {
        val state = _uiState.value
        val scanned = state.skuInput.trim()
        if (scanned.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.putaway_feedback_container_required)) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, successMessage = null) }

            lookupPutawayContainerUseCase(
                containerCode = scanned,
            ).onSuccess { detail ->
                val availableItems = detail.items.filter { it.availableQty > 0 }
                if (availableItems.isEmpty()) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            order = null,
                            currentContainer = null,
                            currentContainerItem = null,
                            matchedTasks = emptyList(),
                            selectedTaskIndex = 0,
                            currentLocation = null,
                            error = context.getString(R.string.putaway_feedback_container_empty),
                            successMessage = null,
                        )
                    }
                    return@onSuccess
                }

                val uniqueItemKeys = availableItems.map { item ->
                    listOf(
                        item.skuId,
                        item.batchNumber.orEmpty(),
                        item.qualityStatus
                    ).joinToString("|")
                }.distinct()

                if (uniqueItemKeys.size > 1) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            order = null,
                            currentContainer = null,
                            currentContainerItem = null,
                            matchedTasks = emptyList(),
                            selectedTaskIndex = 0,
                            currentLocation = null,
                            error = context.getString(R.string.putaway_feedback_container_multi_sku_not_supported),
                            successMessage = null,
                        )
                    }
                    return@onSuccess
                }

                val item = availableItems.first()
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        order = null,
                        skuInput = detail.container.containerCode,
                        currentContainer = detail.container,
                        currentContainerItem = item,
                        matchedTasks = emptyList(),
                        selectedTaskIndex = 0,
                        currentLocation = null,
                        error = null,
                        successMessage = null,
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        order = null,
                        currentContainer = null,
                        currentContainerItem = null,
                        matchedTasks = emptyList(),
                        selectedTaskIndex = 0,
                        currentLocation = null,
                        error = error.message ?: context.getString(R.string.putaway_feedback_container_load_failed),
                        successMessage = null,
                    )
                }
            }
        }
    }

    fun selectTask(index: Int) {
        _uiState.update { current ->
            current.copy(
                selectedTaskIndex = index.coerceIn(0, (current.matchedTasks.size - 1).coerceAtLeast(0)),
                currentLocation = null,
                error = null,
                successMessage = null
            )
        }
    }

    fun lookupLocation(locationCode: String) {
        val state = _uiState.value
        val warehouseId = when (state.putawayMode) {
            PUTAWAY_MODE_CONTAINER -> state.currentContainer?.warehouseId.orEmpty()
            else -> state.order?.warehouse?.id.orEmpty()
        }
        if (warehouseId.isBlank()) {
            _uiState.update {
                it.copy(
                    error = if (state.putawayMode == PUTAWAY_MODE_CONTAINER) {
                        context.getString(R.string.putaway_feedback_container_required)
                    } else {
                        context.getString(R.string.putaway_feedback_order_required)
                    }
                )
            }
            return
        }

        viewModelScope.launch {
            lookupPutawayLocationUseCase(
                locationCode = locationCode,
                warehouseId = warehouseId
            ).onSuccess { location ->
                _uiState.update {
                    it.copy(
                        currentLocation = location,
                        error = null,
                        successMessage = null
                    )
                }
            }.onFailure { error ->
                _uiState.update {
                    it.copy(
                        currentLocation = null,
                        error = error.message ?: context.getString(R.string.putaway_feedback_location_lookup_failed),
                        successMessage = null
                    )
                }
            }
        }
    }

    fun submitPutaway(quantityText: String) {
        val state = _uiState.value
        val order = state.order
        val container = state.currentContainer
        val containerItem = state.currentContainerItem
        val location = state.currentLocation
        val task = state.matchedTasks.getOrNull(state.selectedTaskIndex) ?: state.matchedTasks.firstOrNull()
        val scanRequiredMessage = if (state.putawayMode == PUTAWAY_MODE_CONTAINER) {
            context.getString(R.string.putaway_feedback_container_required)
        } else {
            context.getString(R.string.putaway_feedback_sku_required)
        }

        if (order == null) {
            if (state.putawayMode != PUTAWAY_MODE_CONTAINER) {
                _uiState.update { it.copy(error = context.getString(R.string.putaway_feedback_order_required)) }
                return
            }
        }
        if (state.putawayMode == PUTAWAY_MODE_CONTAINER) {
            if (container == null || containerItem == null) {
                _uiState.update { it.copy(error = scanRequiredMessage) }
                return
            }
        } else if (task == null) {
            _uiState.update { it.copy(error = scanRequiredMessage) }
            return
        }
        if (location == null) {
            _uiState.update { it.copy(error = context.getString(R.string.putaway_feedback_location_required)) }
            return
        }

        val quantity = quantityText.toIntOrNull()
        if (quantity == null || quantity <= 0) {
            _uiState.update { it.copy(error = context.getString(R.string.putaway_feedback_quantity_invalid)) }
            return
        }

        if (state.putawayMode == PUTAWAY_MODE_CONTAINER && containerItem != null && quantity > containerItem.availableQty) {
            _uiState.update { it.copy(error = context.getString(R.string.putaway_feedback_quantity_exceeds_container_available)) }
            return
        }

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
                action = {
                    if (state.putawayMode == PUTAWAY_MODE_CONTAINER) {
                        val serialNumbers = if (containerItem?.isSerialManaged == true) {
                            containerItem.serialNumbers.take(quantity)
                        } else {
                            emptyList()
                        }

                        submitPutawayUseCase(
                            PutawaySubmitRequest(
                                mode = "container",
                                containerId = container?.id,
                                containerCode = container?.containerCode,
                                locationId = location.id,
                                locationCode = location.locationCode,
                                skuId = containerItem!!.skuId,
                                skuCode = containerItem.skuCode,
                                quantity = quantity,
                                qualityStatus = containerItem.qualityStatus,
                                batchNumber = containerItem.batchNumber,
                                serialNumbers = serialNumbers,
                                deviceType = "PDA"
                            )
                        ).map {
                            PutawaySubmitOutcome(
                                quantity = quantity,
                                refreshedOrder = null,
                                refreshErrorMessage = null
                            )
                        }
                    } else {
                        val warehouseId = order?.warehouse?.id.orEmpty()
                        val clientId = order?.client?.id.orEmpty()
                        if (warehouseId.isBlank() || clientId.isBlank() || task == null || order == null) {
                            throw Exception(context.getString(R.string.putaway_feedback_submit_failed))
                        }

                        submitPutawayUseCase(
                            PutawaySubmitRequest(
                                mode = "sku",
                                locationId = location.id,
                                locationCode = location.locationCode,
                                skuId = task.skuId,
                                skuCode = task.skuCode,
                                quantity = quantity,
                                warehouseId = warehouseId,
                                clientId = clientId,
                                putawayOrderId = order.id,
                                putawayLineId = task.id,
                                batchNumber = task.batchNumber,
                                expiryDate = task.expiryDate,
                                serialNumbers = emptyList(),
                                deviceType = "PDA"
                            )
                        ).mapCatching {
                            val refreshedOrderResult = loadPutawayOrderUseCase(order.putawayOrderNumber)
                            PutawaySubmitOutcome(
                                quantity = quantity,
                                refreshedOrder = refreshedOrderResult.getOrNull(),
                                refreshErrorMessage = refreshedOrderResult.exceptionOrNull()?.message
                                    ?: if (refreshedOrderResult.isFailure) {
                                        context.getString(R.string.putaway_feedback_order_load_failed)
                                    } else {
                                        null
                                    }
                            )
                        }
                    }
                },
                onSuccess = { current, outcome ->
                    if (current.putawayMode == PUTAWAY_MODE_CONTAINER && current.currentContainerItem != null) {
                        val remainingQty = (current.currentContainerItem.availableQty - outcome.quantity).coerceAtLeast(0)
                        current.copy(
                            submitAction = PdaActionState.Success,
                            currentContainer = if (remainingQty > 0) current.currentContainer else null,
                            currentContainerItem = if (remainingQty > 0) {
                                current.currentContainerItem.copy(availableQty = remainingQty)
                            } else {
                                null
                            },
                            skuInput = if (remainingQty > 0) {
                                current.currentContainer?.containerCode.orEmpty()
                            } else {
                                ""
                            },
                            matchedTasks = emptyList(),
                            selectedTaskIndex = 0,
                            currentLocation = null,
                            error = null,
                            successMessage = context.getString(
                                R.string.putaway_feedback_submit_success_format,
                                outcome.quantity
                            )
                        )
                    } else {
                        current.copy(
                            submitAction = PdaActionState.Success,
                            order = outcome.refreshedOrder ?: current.order,
                            currentContainer = null,
                            currentContainerItem = null,
                            skuInput = "",
                            matchedTasks = emptyList(),
                            selectedTaskIndex = 0,
                            currentLocation = null,
                            error = outcome.refreshErrorMessage,
                            successMessage = context.getString(
                                R.string.putaway_feedback_submit_success_format,
                                outcome.quantity
                            )
                        )
                    }
                },
                onFailure = { current, error ->
                    current.copy(
                        submitAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.putaway_feedback_submit_failed),
                        successMessage = null
                    )
                }
            )
        }
    }

    fun reset() {
        _uiState.value = PutawaySkuUiState()
    }
}
