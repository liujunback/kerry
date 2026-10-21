package com.kec.wms.pda.presentation.returns

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.ReturnCountLineRequest
import com.kec.wms.pda.data.model.ReturnOrder
import com.kec.wms.pda.data.model.ReturnPutawayExecuteRequest
import com.kec.wms.pda.data.model.ReturnPutawayLine
import com.kec.wms.pda.data.model.ReturnPutawayOrder
import com.kec.wms.pda.data.model.ReturnSignInConfirmRequest
import com.kec.wms.pda.data.model.ReturnSignInLookupResult
import com.kec.wms.pda.data.repository.ReturnRepository
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaSoundEvent
import com.kec.wms.pda.presentation.common.PdaUiEvent
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

private const val MAX_RETURN_PHOTO_BYTES = 5 * 1024 * 1024

data class ReturnSignInUiState(
    val logisticsNo: String = "",
    val lookupResult: ReturnSignInLookupResult? = null,
    val signedOrder: ReturnOrder? = null,
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val feedbackMessage: String? = null,
    val feedbackTone: PdaFeedbackTone = PdaFeedbackTone.Info,
)

@HiltViewModel
class ReturnSignInViewModel @Inject constructor(
    private val returnRepository: ReturnRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {
    private val _uiState = MutableStateFlow(ReturnSignInUiState())
    val uiState: StateFlow<ReturnSignInUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun updateLogisticsNo(value: String) {
        _uiState.update {
            it.copy(
                logisticsNo = value,
                lookupResult = if (value.trim() == it.logisticsNo.trim()) it.lookupResult else null,
                signedOrder = null,
                feedbackMessage = null
            )
        }
    }

    fun lookup() {
        val logisticsNo = _uiState.value.logisticsNo.trim()
        if (logisticsNo.isBlank()) {
            showError(context.getString(R.string.return_error_logistics_required))
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, lookupResult = null, signedOrder = null, feedbackMessage = null) }
            returnRepository.lookupSignIn(logisticsNo)
                .onSuccess { result ->
                    val message = when (result.matchType) {
                        "PRE_RETURN" -> context.getString(R.string.return_sign_in_feedback_pre_return_loaded)
                        "OUTBOUND_ORDER" -> context.getString(R.string.return_sign_in_feedback_outbound_loaded)
                        else -> context.getString(R.string.return_sign_in_feedback_not_found)
                    }
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            lookupResult = result,
                            feedbackMessage = message,
                            feedbackTone = if (result.matchType == "NOT_FOUND") PdaFeedbackTone.Error else PdaFeedbackTone.Success
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(if (result.matchType == "NOT_FOUND") PdaSoundEvent.BusinessError else PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            lookupResult = null,
                            feedbackMessage = error.message ?: context.getString(R.string.return_sign_in_error_lookup_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    fun confirm() {
        val state = _uiState.value
        val result = state.lookupResult
        val logisticsNo = state.logisticsNo.trim()
        if (result == null || result.matchType == "NOT_FOUND") {
            showError(context.getString(R.string.return_sign_in_error_match_required))
            return
        }

        val request = ReturnSignInConfirmRequest(
            logisticsNo = logisticsNo,
            returnOrderId = result.returnOrder?.id,
            outboundOrderId = result.outboundOrder?.id,
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, feedbackMessage = null) }
            returnRepository.confirmSignIn(request)
                .onSuccess { order ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            lookupResult = null,
                            signedOrder = order,
                            feedbackMessage = context.getString(R.string.return_sign_in_feedback_success, order.returnNo),
                            feedbackTone = PdaFeedbackTone.Success
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            feedbackMessage = error.message ?: context.getString(R.string.return_sign_in_error_confirm_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    fun reset() {
        _uiState.value = ReturnSignInUiState()
    }

    private fun showError(message: String) {
        _uiState.update { it.copy(feedbackMessage = message, feedbackTone = PdaFeedbackTone.Error) }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
    }
}

data class ReturnCountingUiState(
    val logisticsNo: String = "",
    val order: ReturnOrder? = null,
    val barcode: String = "",
    val countedQty: String = "1",
    val quality: String = "GOOD",
    val batchNumber: String = "",
    val expiryDate: String = "",
    val containerCode: String = "",
    val tempLocationCode: String = "",
    val photoUrls: List<String> = emptyList(),
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val isUploadingPhoto: Boolean = false,
    val isCompleting: Boolean = false,
    val feedbackMessage: String? = null,
    val feedbackTone: PdaFeedbackTone = PdaFeedbackTone.Info,
)

@HiltViewModel
class ReturnCountingViewModel @Inject constructor(
    private val returnRepository: ReturnRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {
    private val _uiState = MutableStateFlow(ReturnCountingUiState())
    val uiState: StateFlow<ReturnCountingUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun updateLogisticsNo(value: String) = _uiState.update { it.copy(logisticsNo = value, feedbackMessage = null) }
    fun updateBarcode(value: String) = _uiState.update { it.copy(barcode = value, feedbackMessage = null) }
    fun updateCountedQty(value: String) = _uiState.update { it.copy(countedQty = value, feedbackMessage = null) }
    fun updateQuality(value: String) = _uiState.update { it.copy(quality = value, feedbackMessage = null) }
    fun updateBatchNumber(value: String) = _uiState.update { it.copy(batchNumber = value, feedbackMessage = null) }
    fun updateExpiryDate(value: String) = _uiState.update { it.copy(expiryDate = value, feedbackMessage = null) }
    fun updateContainerCode(value: String) = _uiState.update { it.copy(containerCode = value, feedbackMessage = null) }
    fun updateTempLocationCode(value: String) = _uiState.update { it.copy(tempLocationCode = value, feedbackMessage = null) }

    fun lookup() {
        val logisticsNo = _uiState.value.logisticsNo.trim()
        if (logisticsNo.isBlank()) {
            showError(context.getString(R.string.return_error_logistics_required))
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, order = null, feedbackMessage = null) }
            returnRepository.lookupCounting(logisticsNo)
                .onSuccess { order ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            order = order,
                            feedbackMessage = context.getString(R.string.return_counting_feedback_loaded, order.returnNo),
                            feedbackTone = PdaFeedbackTone.Success
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            order = null,
                            feedbackMessage = error.message ?: context.getString(R.string.return_counting_error_lookup_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    fun uploadPhoto(file: File) {
        viewModelScope.launch {
            _uiState.update { it.copy(isUploadingPhoto = true, feedbackMessage = null) }
            runCatching { compressPhoto(file) }
                .mapCatching { compressed -> returnRepository.uploadPhoto(compressed).getOrThrow() }
                .onSuccess { result ->
                    _uiState.update {
                        it.copy(
                            isUploadingPhoto = false,
                            photoUrls = it.photoUrls + result.url,
                            feedbackMessage = context.getString(R.string.return_counting_feedback_photo_uploaded),
                            feedbackTone = PdaFeedbackTone.Success
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isUploadingPhoto = false,
                            feedbackMessage = error.message ?: context.getString(R.string.return_counting_error_photo_upload_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    fun submitLine() {
        val state = _uiState.value
        val order = state.order
        val quantity = state.countedQty.trim().toIntOrNull()
        when {
            order == null -> {
                showError(context.getString(R.string.return_counting_error_order_required))
                return
            }
            state.barcode.trim().isBlank() -> {
                showError(context.getString(R.string.return_error_barcode_required))
                return
            }
            quantity == null || quantity <= 0 -> {
                showError(context.getString(R.string.return_error_quantity_invalid))
                return
            }
            state.containerCode.trim().isBlank() -> {
                showError(context.getString(R.string.return_error_container_required))
                return
            }
            state.tempLocationCode.trim().isBlank() -> {
                showError(context.getString(R.string.return_error_temp_location_required))
                return
            }
            state.quality == "DAMAGED" && state.photoUrls.isEmpty() -> {
                showError(context.getString(R.string.return_counting_error_photo_required))
                return
            }
        }
        val loadedOrder = order ?: return
        val countedQty = quantity ?: return

        val request = ReturnCountLineRequest(
            barcode = state.barcode.trim(),
            countedQty = countedQty,
            quality = state.quality,
            batchNumber = state.batchNumber.trim().takeIf { it.isNotBlank() },
            expiryDate = state.expiryDate.trim().takeIf { it.isNotBlank() },
            containerCode = state.containerCode.trim(),
            tempLocationCode = state.tempLocationCode.trim(),
            photoUrls = state.photoUrls,
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, feedbackMessage = null) }
            returnRepository.submitCountLine(loadedOrder.id, request)
                .onSuccess { line ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            barcode = "",
                            countedQty = "1",
                            batchNumber = "",
                            expiryDate = "",
                            photoUrls = emptyList(),
                            feedbackMessage = context.getString(R.string.return_counting_feedback_line_saved, line.skuCode),
                            feedbackTone = PdaFeedbackTone.Success
                        )
                    }
                    lookup()
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            feedbackMessage = error.message ?: context.getString(R.string.return_counting_error_submit_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    fun completeCounting() {
        val order = _uiState.value.order
        if (order == null) {
            showError(context.getString(R.string.return_counting_error_order_required))
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isCompleting = true, feedbackMessage = null) }
            returnRepository.completeCounting(order.id)
                .onSuccess { completed ->
                    _uiState.update {
                        it.copy(
                            isCompleting = false,
                            order = completed,
                            feedbackMessage = context.getString(R.string.return_counting_feedback_complete_success),
                            feedbackTone = PdaFeedbackTone.Success
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isCompleting = false,
                            feedbackMessage = error.message ?: context.getString(R.string.return_counting_error_complete_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    fun reset() {
        _uiState.value = ReturnCountingUiState()
    }

    private fun compressPhoto(source: File): File {
        val bitmap = BitmapFactory.decodeFile(source.absolutePath)
            ?: throw IllegalArgumentException(context.getString(R.string.return_counting_error_photo_invalid))
        val output = File(context.cacheDir, "return-upload-${System.currentTimeMillis()}.jpg")
        var quality = 85
        do {
            FileOutputStream(output, false).use { stream ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
            }
            quality -= 15
        } while (output.length() > MAX_RETURN_PHOTO_BYTES && quality >= 35)
        if (output.length() > MAX_RETURN_PHOTO_BYTES) {
            throw IllegalArgumentException(context.getString(R.string.return_counting_error_photo_too_large))
        }
        return output
    }

    private fun showError(message: String) {
        _uiState.update { it.copy(feedbackMessage = message, feedbackTone = PdaFeedbackTone.Error) }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
    }
}

data class ReturnPutawayUiState(
    val orders: List<ReturnPutawayOrder> = emptyList(),
    val selectedOrder: ReturnPutawayOrder? = null,
    val selectedLine: ReturnPutawayLine? = null,
    val putawayOrderNumber: String = "",
    val containerCode: String = "",
    val logisticsNo: String = "",
    val barcode: String = "",
    val quality: String = "GOOD",
    val quantity: String = "1",
    val targetLocationCode: String = "",
    val isLoading: Boolean = false,
    val isSubmitting: Boolean = false,
    val feedbackMessage: String? = null,
    val feedbackTone: PdaFeedbackTone = PdaFeedbackTone.Info,
)

@HiltViewModel
class ReturnPutawayViewModel @Inject constructor(
    private val returnRepository: ReturnRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {
    private val _uiState = MutableStateFlow(ReturnPutawayUiState())
    val uiState: StateFlow<ReturnPutawayUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun enterScreen() {
        if (_uiState.value.orders.isEmpty()) {
            loadOrders()
        }
    }

    fun updatePutawayOrderNumber(value: String) = _uiState.update { it.copy(putawayOrderNumber = value, feedbackMessage = null) }
    fun updateContainerCode(value: String) = _uiState.update { it.copy(containerCode = value, feedbackMessage = null) }
    fun updateLogisticsNo(value: String) = _uiState.update { it.copy(logisticsNo = value, feedbackMessage = null) }
    fun updateBarcode(value: String) = _uiState.update { it.copy(barcode = value, feedbackMessage = null) }
    fun updateQuality(value: String) = _uiState.update { it.copy(quality = value, feedbackMessage = null) }
    fun updateQuantity(value: String) = _uiState.update { it.copy(quantity = value, feedbackMessage = null) }
    fun updateTargetLocationCode(value: String) = _uiState.update { it.copy(targetLocationCode = value, feedbackMessage = null) }

    fun loadOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, feedbackMessage = null) }
            returnRepository.getPutawayOrders()
                .onSuccess { orders ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            orders = orders,
                            feedbackMessage = if (orders.isEmpty()) context.getString(R.string.return_putaway_feedback_empty) else null,
                            feedbackTone = PdaFeedbackTone.Info
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            orders = emptyList(),
                            feedbackMessage = error.message ?: context.getString(R.string.return_putaway_error_load_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    fun scanOrder() {
        val target = _uiState.value.putawayOrderNumber.trim()
        if (target.isBlank()) {
            showError(context.getString(R.string.return_putaway_error_order_number_required))
            return
        }
        val order = _uiState.value.orders.firstOrNull { it.putawayOrderNumber.equals(target, ignoreCase = true) }
        if (order == null) {
            loadOrders()
            showError(context.getString(R.string.return_putaway_error_order_not_found))
            return
        }
        selectOrder(order)
    }

    fun selectOrder(order: ReturnPutawayOrder) {
        val line = order.lines.firstOrNull { it.remainingQty > 0 && it.status != "COMPLETED" }
        if (line == null) {
            showError(context.getString(R.string.return_putaway_error_no_pending_line))
            return
        }

        _uiState.update {
            it.copy(
                selectedOrder = order,
                selectedLine = line,
                putawayOrderNumber = order.putawayOrderNumber,
                containerCode = line.containerCode.orEmpty(),
                logisticsNo = order.returnOrder.logisticsNo,
                barcode = line.barcode ?: line.skuCode,
                quality = line.quality,
                quantity = line.remainingQty.toString(),
                targetLocationCode = "",
                feedbackMessage = context.getString(R.string.return_putaway_feedback_loaded, order.putawayOrderNumber),
                feedbackTone = PdaFeedbackTone.Success
            )
        }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
    }

    fun execute() {
        val state = _uiState.value
        val quantity = state.quantity.trim().toIntOrNull()
        when {
            state.putawayOrderNumber.trim().isBlank() -> {
                showError(context.getString(R.string.return_putaway_error_order_number_required))
                return
            }
            state.containerCode.trim().isBlank() -> {
                showError(context.getString(R.string.return_error_container_required))
                return
            }
            state.logisticsNo.trim().isBlank() -> {
                showError(context.getString(R.string.return_error_logistics_required))
                return
            }
            state.barcode.trim().isBlank() -> {
                showError(context.getString(R.string.return_error_barcode_required))
                return
            }
            quantity == null || quantity <= 0 -> {
                showError(context.getString(R.string.return_error_quantity_invalid))
                return
            }
            state.targetLocationCode.trim().isBlank() -> {
                showError(context.getString(R.string.return_putaway_error_target_location_required))
                return
            }
        }
        val putawayQty = quantity ?: return

        val request = ReturnPutawayExecuteRequest(
            putawayOrderNumber = state.putawayOrderNumber.trim(),
            containerCode = state.containerCode.trim(),
            logisticsNo = state.logisticsNo.trim(),
            barcode = state.barcode.trim(),
            quality = state.quality,
            quantity = putawayQty,
            targetLocationCode = state.targetLocationCode.trim(),
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, feedbackMessage = null) }
            returnRepository.executePutaway(request)
                .onSuccess {
                    refreshAfterSubmit(state.putawayOrderNumber.trim())
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            feedbackMessage = error.message ?: context.getString(R.string.return_putaway_error_submit_failed),
                            feedbackTone = PdaFeedbackTone.Error
                        )
                    }
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
                }
        }
    }

    private suspend fun refreshAfterSubmit(currentOrderNumber: String) {
        returnRepository.getPutawayOrders()
            .onSuccess { orders ->
                val refreshedOrder = orders.firstOrNull {
                    it.putawayOrderNumber.equals(currentOrderNumber, ignoreCase = true)
                }
                val nextLine = refreshedOrder?.lines?.firstOrNull { it.remainingQty > 0 && it.status != "COMPLETED" }
                _uiState.update {
                    if (refreshedOrder != null && nextLine != null) {
                        it.copy(
                            isSubmitting = false,
                            orders = orders,
                            selectedOrder = refreshedOrder,
                            selectedLine = nextLine,
                            containerCode = nextLine.containerCode.orEmpty(),
                            logisticsNo = refreshedOrder.returnOrder.logisticsNo,
                            barcode = nextLine.barcode ?: nextLine.skuCode,
                            quality = nextLine.quality,
                            quantity = nextLine.remainingQty.toString(),
                            targetLocationCode = "",
                            feedbackMessage = context.getString(R.string.return_putaway_feedback_success),
                            feedbackTone = PdaFeedbackTone.Success
                        )
                    } else {
                        it.copy(
                            isSubmitting = false,
                            orders = orders,
                            selectedOrder = null,
                            selectedLine = null,
                            putawayOrderNumber = "",
                            containerCode = "",
                            logisticsNo = "",
                            barcode = "",
                            quality = "GOOD",
                            quantity = "1",
                            targetLocationCode = "",
                            feedbackMessage = context.getString(R.string.return_putaway_feedback_success),
                            feedbackTone = PdaFeedbackTone.Success
                        )
                    }
                }
            }
            .onFailure { error ->
                _uiState.update {
                    it.copy(
                        isSubmitting = false,
                        feedbackMessage = error.message ?: context.getString(R.string.return_putaway_error_load_failed),
                        feedbackTone = PdaFeedbackTone.Error
                    )
                }
            }
    }

    fun reset() {
        _uiState.value = ReturnPutawayUiState()
    }

    private fun showError(message: String) {
        _uiState.update { it.copy(feedbackMessage = message, feedbackTone = PdaFeedbackTone.Error) }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
    }
}
