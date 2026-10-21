package com.kec.wms.pda.presentation.picking

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.PickingLine
import com.kec.wms.pda.data.model.PickingTaskDetail
import com.kec.wms.pda.data.model.PickingTaskSummary
import com.kec.wms.pda.domain.usecase.BindPickingContainerUseCase
import com.kec.wms.pda.domain.usecase.CompletePickingTaskUseCase
import com.kec.wms.pda.domain.usecase.LoadPickingTaskDetailUseCase
import com.kec.wms.pda.domain.usecase.LoadPickingTasksUseCase
import com.kec.wms.pda.domain.usecase.SubmitPickingLineUseCase
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

enum class PickingPhase {
    LIST,
    PREPARE,
    WORKING,
}

data class PickingUiState(
    val phase: PickingPhase = PickingPhase.LIST,
    val tasks: List<PickingTaskSummary> = emptyList(),
    val selectedTask: PickingTaskDetail? = null,
    val currentLineId: String? = null,
    val isLoadingList: Boolean = false,
    val isLoadingDetail: Boolean = false,
    val bindAction: PdaActionState = PdaActionState.Idle,
    val submitAction: PdaActionState = PdaActionState.Idle,
    val completeAction: PdaActionState = PdaActionState.Idle,
    val error: String? = null,
    val successMessage: String? = null,
) {
    val currentLine: PickingLine?
        get() = selectedTask?.lines?.firstOrNull { it.id == currentLineId }
            ?: selectedTask?.recommendedLine

    val pendingLineCount: Int
        get() = selectedTask?.lines?.count { it.status == "PENDING" } ?: 0

    val showCompleteAction: Boolean
        get() = pendingLineCount == 0 && selectedTask != null
}

@HiltViewModel
class PickingViewModel @Inject constructor(
    private val loadPickingTasksUseCase: LoadPickingTasksUseCase,
    private val loadPickingTaskDetailUseCase: LoadPickingTaskDetailUseCase,
    private val bindPickingContainerUseCase: BindPickingContainerUseCase,
    private val submitPickingLineUseCase: SubmitPickingLineUseCase,
    private val completePickingTaskUseCase: CompletePickingTaskUseCase,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(PickingUiState())
    val uiState: StateFlow<PickingUiState> = _uiState.asStateFlow()

    private val _uiEvents = MutableSharedFlow<PdaUiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<PdaUiEvent> = _uiEvents.asSharedFlow()

    fun enterScreen() {
        _uiState.update {
            it.copy(
                phase = PickingPhase.LIST,
                selectedTask = null,
                currentLineId = null,
                bindAction = PdaActionState.Idle,
                submitAction = PdaActionState.Idle,
                completeAction = PdaActionState.Idle,
                error = null,
                successMessage = null,
            )
        }
        loadTasks()
    }

    fun reset() {
        _uiState.value = PickingUiState()
    }

    fun clearFeedback() {
        _uiState.update { it.copy(error = null, successMessage = null) }
    }

    fun loadTasks(preserveFeedback: Boolean = false) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingList = true,
                    error = if (preserveFeedback) it.error else null,
                    successMessage = if (preserveFeedback) it.successMessage else null,
                )
            }

            loadPickingTasksUseCase()
                .onSuccess { tasks ->
                    _uiState.update {
                        it.copy(
                            isLoadingList = false,
                            tasks = tasks,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoadingList = false,
                            error = error.message ?: context.getString(R.string.picking_feedback_load_tasks_failed)
                        )
                    }
                    emitErrorSound(error.message)
                }
        }
    }

    fun openTask(taskId: String) {
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoadingDetail = true,
                    error = null,
                    successMessage = null,
                )
            }

            loadPickingTaskDetailUseCase(taskId)
                .onSuccess { detail ->
                    _uiState.update {
                        it.copy(
                            isLoadingDetail = false,
                            phase = resolvePhase(detail),
                            selectedTask = detail,
                            currentLineId = resolveCurrentLineId(detail, detail.recommendedLine?.id),
                            error = if (detail.status == "IN_PROGRESS" && detail.targetContainer.isNullOrBlank()) {
                                context.getString(R.string.picking_feedback_container_required_resume)
                            } else {
                                null
                            },
                            successMessage = null,
                        )
                    }
                }
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            isLoadingDetail = false,
                            error = error.message ?: context.getString(R.string.picking_feedback_load_detail_failed)
                        )
                    }
                    emitErrorSound(error.message)
                }
        }
    }

    fun backToList() {
        _uiState.update {
            it.copy(
                phase = PickingPhase.LIST,
                selectedTask = null,
                currentLineId = null,
                bindAction = PdaActionState.Idle,
                submitAction = PdaActionState.Idle,
                completeAction = PdaActionState.Idle,
                error = null,
                successMessage = null,
            )
        }
        loadTasks()
    }

    fun bindContainer(containerCode: String) {
        val taskId = _uiState.value.selectedTask?.id
        if (taskId.isNullOrBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.picking_feedback_task_required)) }
            return
        }
        if (containerCode.isBlank()) {
            _uiState.update { it.copy(error = context.getString(R.string.picking_feedback_container_required)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        viewModelScope.launch {
            runPdaAction(
                stateFlow = _uiState,
                onStart = {
                    it.copy(
                        bindAction = PdaActionState.Running,
                        error = null,
                        successMessage = null,
                    )
                },
                action = { bindPickingContainerUseCase(taskId, containerCode.trim()) },
                onSuccess = { current, result ->
                    val detail = result.detail ?: current.selectedTask
                    current.copy(
                        phase = detail?.let { resolvePhase(it) } ?: PickingPhase.WORKING,
                        selectedTask = detail,
                        currentLineId = detail?.let { resolveCurrentLineId(it, it.recommendedLine?.id) },
                        bindAction = PdaActionState.Success,
                        error = null,
                        successMessage = context.getString(R.string.picking_feedback_bind_success),
                    )
                },
                onFailure = { current, error ->
                    current.copy(
                        bindAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.picking_feedback_bind_failed)
                    )
                },
                onSuccessEvent = {
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                },
                onFailureEvent = { error ->
                    emitErrorSound(error.message)
                }
            )
        }
    }

    fun validateLocation(scannedCode: String): Boolean {
        val currentLine = _uiState.value.currentLine
        if (currentLine == null) {
            _uiState.update { it.copy(error = context.getString(R.string.picking_feedback_no_current_line)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return false
        }

        if (!scannedCode.trim().equals(currentLine.locationCode, ignoreCase = true)) {
            _uiState.update {
                it.copy(
                    error = context.getString(
                        R.string.picking_feedback_location_mismatch_format,
                        currentLine.locationCode
                    ),
                    successMessage = null,
                )
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return false
        }

        _uiState.update { it.copy(error = null, successMessage = null) }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
        return true
    }

    fun validateSku(scannedBarcode: String): Boolean {
        val currentLine = _uiState.value.currentLine
        if (currentLine == null) {
            _uiState.update { it.copy(error = context.getString(R.string.picking_feedback_no_current_line)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return false
        }

        val normalized = scannedBarcode.trim()
        val matches = normalized.equals(currentLine.skuCode, ignoreCase = true) ||
            normalized.equals(currentLine.barcode.orEmpty(), ignoreCase = true)

        if (!matches) {
            _uiState.update {
                it.copy(
                    error = context.getString(
                        R.string.picking_feedback_sku_mismatch_format,
                        currentLine.barcode ?: currentLine.skuCode
                    ),
                    successMessage = null,
                )
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return false
        }

        _uiState.update { it.copy(error = null, successMessage = null) }
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
        return true
    }

    fun skipCurrentLine() {
        val state = _uiState.value
        val detail = state.selectedTask ?: return
        val currentLineId = state.currentLine?.id
        val nextLineId = findNextPendingLineId(detail, currentLineId)

        if (nextLineId == null || nextLineId == currentLineId) {
            _uiState.update {
                it.copy(error = context.getString(R.string.picking_feedback_no_next_pending_line))
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        _uiState.update {
            it.copy(
                currentLineId = nextLineId,
                error = null,
                successMessage = null,
            )
        }
    }

    fun submitCurrentLine(
        locationCode: String,
        skuBarcode: String,
        actualQtyInput: String,
        shortageConfirmed: Boolean = false
    ) {
        val state = _uiState.value
        val task = state.selectedTask
        val line = state.currentLine

        if (task == null || line == null) {
            _uiState.update { it.copy(error = context.getString(R.string.picking_feedback_no_current_line)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        if (!validateLocation(locationCode) || !validateSku(skuBarcode)) {
            return
        }

        val actualQty = actualQtyInput.trim().toIntOrNull()
        if (actualQty == null) {
            _uiState.update { it.copy(error = context.getString(R.string.picking_feedback_qty_invalid)) }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        val groupedRemainingQty = task.lines
            .filter {
                it.status == "PENDING" &&
                    it.locationCode == line.locationCode &&
                    it.skuCode == line.skuCode
            }
            .sumOf { it.remainingQty.coerceAtLeast(0) }

        if (actualQty > groupedRemainingQty) {
            _uiState.update {
                it.copy(
                    error = context.getString(
                        R.string.picking_feedback_qty_exceeds_grouped_remaining_format,
                        groupedRemainingQty
                    )
                )
            }
            _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.BusinessError))
            return
        }

        val submittedLineId = line.id

        viewModelScope.launch {
            runPdaAction(
                stateFlow = _uiState,
                onStart = {
                    it.copy(
                        submitAction = PdaActionState.Running,
                        error = null,
                        successMessage = null,
                    )
                },
                action = {
                    submitPickingLineUseCase(
                        taskId = task.id,
                        lineId = submittedLineId,
                        locationCode = locationCode.trim(),
                        skuBarcode = skuBarcode.trim(),
                        actualQty = actualQty,
                        shortageConfirmed = shortageConfirmed,
                        shortageReason = if (shortageConfirmed) {
                            context.getString(R.string.picking_shortage_reason_default)
                        } else {
                            null
                        }
                    )
                },
                onSuccess = { current, result ->
                    val detail = result.detail
                    current.copy(
                        selectedTask = detail,
                        currentLineId = resolveCurrentLineId(detail, findNextPendingLineId(detail, submittedLineId)),
                        submitAction = PdaActionState.Success,
                        error = null,
                        successMessage = if (result.hasShortage) {
                            context.getString(
                                R.string.picking_feedback_shortage_submit_success_format,
                                result.shortageQty
                            )
                        } else {
                            context.getString(R.string.picking_feedback_submit_success)
                        },
                    )
                },
                onFailure = { current, error ->
                    current.copy(
                        submitAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.picking_feedback_submit_failed)
                    )
                },
                onSuccessEvent = {
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ScanSuccess))
                },
                onFailureEvent = { error ->
                    emitErrorSound(error.message)
                }
            )
        }
    }

    fun completePickingTask() {
        val task = _uiState.value.selectedTask
        if (task == null) {
            _uiState.update { it.copy(error = context.getString(R.string.picking_feedback_task_required)) }
            return
        }

        viewModelScope.launch {
            val result = runPdaAction(
                stateFlow = _uiState,
                onStart = {
                    it.copy(
                        completeAction = PdaActionState.Running,
                        error = null,
                        successMessage = null,
                    )
                },
                action = { completePickingTaskUseCase(task.id) },
                onSuccess = { current, result ->
                    current.copy(
                        phase = PickingPhase.LIST,
                        selectedTask = null,
                        currentLineId = null,
                        completeAction = PdaActionState.Success,
                        error = null,
                        successMessage = if (result.totalShortQty > 0) {
                            context.getString(
                                R.string.picking_feedback_complete_shortage_success_format,
                                result.totalShortQty
                            )
                        } else {
                            context.getString(
                                R.string.picking_feedback_complete_success_format,
                                result.downstreamArea
                            )
                        },
                    )
                },
                onFailure = { current, error ->
                    current.copy(
                        completeAction = PdaActionState.Error,
                        error = error.message ?: context.getString(R.string.picking_feedback_complete_failed)
                    )
                },
                onSuccessEvent = {
                    _uiEvents.tryEmit(PdaUiEvent.PlaySound(PdaSoundEvent.ActionCompleted))
                },
                onFailureEvent = { error ->
                    emitErrorSound(error.message)
                }
            )

            if (result.isSuccess) {
                loadTasks(preserveFeedback = true)
            }
        }
    }

    private fun resolvePhase(detail: PickingTaskDetail): PickingPhase {
        return if (detail.status == "IN_PROGRESS" && !detail.targetContainer.isNullOrBlank()) {
            PickingPhase.WORKING
        } else {
            PickingPhase.PREPARE
        }
    }

    private fun resolveCurrentLineId(detail: PickingTaskDetail, preferredLineId: String?): String? {
        val preferred = preferredLineId?.let { id ->
            detail.lines.firstOrNull { line -> line.id == id && line.status == "PENDING" }?.id
        }
        return preferred ?: detail.recommendedLine?.id
    }

    private fun findNextPendingLineId(detail: PickingTaskDetail, fromLineId: String?): String? {
        val pendingLines = detail.lines.filter { it.status == "PENDING" }
        if (pendingLines.isEmpty()) {
            return null
        }

        if (fromLineId.isNullOrBlank()) {
            return pendingLines.first().id
        }

        val currentIndex = detail.lines.indexOfFirst { it.id == fromLineId }
        if (currentIndex < 0) {
            return pendingLines.first().id
        }

        val nextAfterCurrent = detail.lines
            .drop(currentIndex + 1)
            .firstOrNull { it.status == "PENDING" }
            ?.id

        return nextAfterCurrent ?: pendingLines.first().id
    }

    private fun emitErrorSound(message: String?) {
        _uiEvents.tryEmit(PdaUiEvent.PlaySound(resolveErrorSound(message)))
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
