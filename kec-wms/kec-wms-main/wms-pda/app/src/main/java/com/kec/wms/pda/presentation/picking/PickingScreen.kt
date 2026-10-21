package com.kec.wms.pda.presentation.picking

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ViewList
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.PickingLine
import com.kec.wms.pda.data.model.PickingTaskDetail
import com.kec.wms.pda.data.model.PickingTaskSummary
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely
import kotlinx.coroutines.launch

@Composable
fun PickingScreen(
    uiState: PickingUiState,
    onTaskClick: (String) -> Unit,
    onBindContainer: (String) -> Unit,
    onValidateLocation: (String) -> Boolean,
    onValidateSku: (String) -> Boolean,
    onSubmitCurrentLine: (String, String, String, Boolean) -> Unit,
    onSkipCurrentLine: () -> Unit,
    onCompleteTask: () -> Unit,
    onClearFeedback: () -> Unit,
    onBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val task = uiState.selectedTask
    val currentLine = uiState.currentLine

    val containerFocus = remember { FocusRequester() }
    val locationFocus = remember { FocusRequester() }
    val skuFocus = remember { FocusRequester() }
    val qtyFocus = remember { FocusRequester() }

    var containerInput by rememberSaveable(task?.id) {
        mutableStateOf(task?.targetContainer.orEmpty())
    }
    var locationInput by rememberSaveable(task?.id, currentLine?.id) { mutableStateOf("") }
    var skuInput by rememberSaveable(task?.id, currentLine?.id) { mutableStateOf("") }
    var qtyInput by rememberSaveable(task?.id, currentLine?.id) { mutableStateOf("") }
    var showCompleteDialog by rememberSaveable(task?.id) { mutableStateOf(false) }
    var showProgressDialog by rememberSaveable(task?.id) { mutableStateOf(false) }
    var pendingShortageSubmit by remember(task?.id, currentLine?.id) {
        mutableStateOf<PendingPickingShortageSubmit?>(null)
    }

    fun submitCurrentLineWithShortageCheck(shortageConfirmed: Boolean = false) {
        val activeTask = task
        val activeLine = currentLine
        val actualQty = qtyInput.trim().toIntOrNull()
        val groupedRemainingQty = if (activeTask != null && activeLine != null) {
            activeTask.lines
                .filter {
                    it.status == "PENDING" &&
                        it.locationCode == activeLine.locationCode &&
                        it.skuCode == activeLine.skuCode
                }
                .sumOf { it.remainingQty.coerceAtLeast(0) }
        } else {
            0
        }

        if (!shortageConfirmed && actualQty != null && actualQty < groupedRemainingQty) {
            pendingShortageSubmit = PendingPickingShortageSubmit(
                locationCode = locationInput,
                skuBarcode = skuInput,
                actualQtyInput = qtyInput,
                shortageQty = groupedRemainingQty - actualQty
            )
            return
        }

        onSubmitCurrentLine(locationInput, skuInput, qtyInput, shortageConfirmed)
    }

    LaunchedEffect(uiState.phase, task?.id) {
        if (uiState.phase == PickingPhase.PREPARE) {
            containerInput = task?.targetContainer.orEmpty()
            containerFocus.requestFocusSafely()
        }
    }

    LaunchedEffect(currentLine?.id) {
        locationInput = ""
        skuInput = ""
        qtyInput = ""
        if (uiState.phase == PickingPhase.WORKING && currentLine != null) {
            locationFocus.requestFocusSafely()
        }
    }

    LaunchedEffect(uiState.phase, task?.id, currentLine?.id) {
        if (uiState.phase == PickingPhase.WORKING && task != null && currentLine != null) {
            locationFocus.requestFocusSafely()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        PdaTopBar(
            title = when (uiState.phase) {
                PickingPhase.LIST -> stringResource(R.string.picking_title)
                PickingPhase.PREPARE -> stringResource(R.string.picking_prepare_title)
                PickingPhase.WORKING -> stringResource(R.string.picking_working_title)
            },
            onBack = onBack,
            trailingContent = if (uiState.phase == PickingPhase.WORKING && task != null) {
                {
                    IconButton(onClick = { showProgressDialog = true }) {
                        Icon(
                            imageVector = Icons.Filled.ViewList,
                            contentDescription = stringResource(R.string.picking_progress_chip_label),
                            tint = MaterialTheme.colorScheme.onPrimary
                        )
                    }
                }
            } else {
                null
            }
        )

        when (uiState.phase) {
            PickingPhase.LIST -> PickingTaskListContent(uiState = uiState, onTaskClick = onTaskClick)
            PickingPhase.PREPARE -> PickingPrepareContent(
                task = task,
                uiState = uiState,
                containerInput = containerInput,
                containerFocus = containerFocus,
                onContainerInputChange = {
                    containerInput = it
                    onClearFeedback()
                },
                onBindContainer = { onBindContainer(containerInput) }
            )

            PickingPhase.WORKING -> PickingWorkingContent(
                task = task,
                currentLine = currentLine,
                uiState = uiState,
                locationInput = locationInput,
                skuInput = skuInput,
                qtyInput = qtyInput,
                locationFocus = locationFocus,
                skuFocus = skuFocus,
                qtyFocus = qtyFocus,
                onLocationInputChange = {
                    locationInput = it
                    onClearFeedback()
                },
                onSkuInputChange = {
                    skuInput = it
                    onClearFeedback()
                },
                onQtyInputChange = {
                    qtyInput = it
                    onClearFeedback()
                },
                onSubmitCurrentLine = { submitCurrentLineWithShortageCheck() },
                onValidateLocation = { scanned ->
                    if (onValidateLocation(scanned)) {
                        scope.launch { skuFocus.requestFocusSafely() }
                    }
                },
                onValidateSku = { scanned ->
                    if (onValidateSku(scanned)) {
                        scope.launch { qtyFocus.requestFocusSafely() }
                    }
                },
                onSkipCurrentLine = onSkipCurrentLine,
                onShowProgressDialog = { showProgressDialog = true },
                onShowCompleteDialog = { showCompleteDialog = true }
            )
        }
    }

    if (showProgressDialog && task != null) {
        PickingProgressDialog(
            task = task,
            onDismiss = { showProgressDialog = false }
        )
    }

    if (showCompleteDialog && task != null) {
        PickingCompleteDialog(
            task = task,
            onDismiss = { showCompleteDialog = false },
            onConfirm = {
                showCompleteDialog = false
                onCompleteTask()
            }
        )
    }

    pendingShortageSubmit?.let { pending ->
        PickingShortageConfirmDialog(
            shortageQty = pending.shortageQty,
            onDismiss = { pendingShortageSubmit = null },
            onConfirm = {
                pendingShortageSubmit = null
                onSubmitCurrentLine(
                    pending.locationCode,
                    pending.skuBarcode,
                    pending.actualQtyInput,
                    true
                )
            }
        )
    }
}

@Composable
private fun PickingTaskListContent(
    uiState: PickingUiState,
    onTaskClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        PickingFeedback(uiState = uiState)

        if (uiState.isLoadingList) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return
        }

        if (uiState.tasks.isEmpty()) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = stringResource(R.string.picking_list_empty),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            return
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(uiState.tasks, key = { it.id }) { task ->
                PickingTaskCard(task = task, onClick = { onTaskClick(task.id) })
            }
        }
    }
}

@Composable
private fun PickingPrepareContent(
    task: PickingTaskDetail?,
    uiState: PickingUiState,
    containerInput: String,
    containerFocus: FocusRequester,
    onContainerInputChange: (String) -> Unit,
    onBindContainer: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 10.dp, vertical = 8.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        task?.let { PickingPrepareTaskCard(task = it) }
        PickingFeedback(uiState = uiState)

        Card {
            Column(
                modifier = Modifier.padding(10.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = stringResource(R.string.picking_prepare_hint),
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp
                )
                PdaTextField(
                    value = containerInput,
                    onValueChange = onContainerInputChange,
                    label = stringResource(R.string.picking_container_label),
                    focusRequester = containerFocus,
                    submitOnLineBreak = true,
                    onLineBreakSubmit = { onBindContainer() },
                    onImeAction = onBindContainer,
                    enabled = !uiState.bindAction.isRunning
                )
                PdaButton(
                    text = stringResource(
                        if (uiState.bindAction.isRunning) {
                            R.string.picking_action_binding
                        } else {
                            R.string.picking_action_bind_container
                        }
                    ),
                    onClick = onBindContainer,
                    enabled = !uiState.bindAction.isRunning
                )
            }
        }
    }
}

@Composable
private fun PickingWorkingContent(
    task: PickingTaskDetail?,
    currentLine: PickingLine?,
    uiState: PickingUiState,
    locationInput: String,
    skuInput: String,
    qtyInput: String,
    locationFocus: FocusRequester,
    skuFocus: FocusRequester,
    qtyFocus: FocusRequester,
    onLocationInputChange: (String) -> Unit,
    onSkuInputChange: (String) -> Unit,
    onQtyInputChange: (String) -> Unit,
    onSubmitCurrentLine: () -> Unit,
    onValidateLocation: (String) -> Unit,
    onValidateSku: (String) -> Unit,
    onSkipCurrentLine: () -> Unit,
    onShowProgressDialog: () -> Unit,
    onShowCompleteDialog: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 8.dp, vertical = 6.dp)
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        task?.let { PickingWorkingTaskBar(task = it, onShowProgressDialog = onShowProgressDialog) }
        PickingFeedback(uiState = uiState)

        if (currentLine != null) {
            PickingCurrentLineCard(task = task, line = currentLine)

            Card {
                Column(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    PdaTextField(
                        value = locationInput,
                        onValueChange = onLocationInputChange,
                        label = stringResource(R.string.picking_location_input_label),
                        focusRequester = locationFocus,
                        imeAction = ImeAction.Next,
                        submitOnLineBreak = true,
                        onLineBreakSubmit = onValidateLocation,
                        onImeAction = { onValidateLocation(locationInput) },
                        enabled = !uiState.submitAction.isRunning,
                        height = 46.dp
                    )
                    PdaTextField(
                        value = skuInput,
                        onValueChange = onSkuInputChange,
                        label = stringResource(R.string.picking_barcode_input_label),
                        focusRequester = skuFocus,
                        imeAction = ImeAction.Next,
                        submitOnLineBreak = true,
                        onLineBreakSubmit = onValidateSku,
                        onImeAction = { onValidateSku(skuInput) },
                        enabled = !uiState.submitAction.isRunning,
                        height = 46.dp
                    )
                    PdaTextField(
                        value = qtyInput,
                        onValueChange = onQtyInputChange,
                        label = stringResource(R.string.picking_actual_qty_label),
                        focusRequester = qtyFocus,
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done,
                        submitOnLineBreak = true,
                        onLineBreakSubmit = { onSubmitCurrentLine() },
                        onImeAction = onSubmitCurrentLine,
                        enabled = !uiState.submitAction.isRunning,
                        height = 46.dp
                    )
                }
            }
        } else {
            Card {
                Text(
                    text = stringResource(R.string.picking_all_lines_processed),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    textAlign = TextAlign.Center
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            PdaButton(
                text = stringResource(
                    if (uiState.submitAction.isRunning) {
                        R.string.picking_action_submitting
                    } else {
                        R.string.picking_action_submit
                    }
                ),
                onClick = onSubmitCurrentLine,
                enabled = currentLine != null && !uiState.submitAction.isRunning,
                modifier = Modifier.weight(1f),
                height = 44.dp,
                fontSize = 15.sp
            )

            PdaButton(
                text = stringResource(R.string.picking_action_skip),
                onClick = onSkipCurrentLine,
                enabled = currentLine != null && !uiState.submitAction.isRunning,
                variant = PdaButtonVariant.Secondary,
                fillMaxWidth = false,
                modifier = Modifier.width(80.dp),
                height = 44.dp,
                fontSize = 14.sp
            )
        }

        if (uiState.showCompleteAction) {
            PdaButton(
                text = stringResource(
                    if (uiState.completeAction.isRunning) {
                        R.string.picking_action_completing
                    } else {
                        R.string.picking_action_complete
                    }
                ),
                onClick = onShowCompleteDialog,
                enabled = !uiState.completeAction.isRunning,
                variant = PdaButtonVariant.Secondary,
                height = 40.dp,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
private fun PickingFeedback(uiState: PickingUiState) {
    uiState.error?.let { message ->
        PdaFeedbackBanner(
            message = message,
            title = stringResource(R.string.picking_feedback_error),
            tone = PdaFeedbackTone.Error
        )
    }

    uiState.successMessage?.let { message ->
        PdaFeedbackBanner(
            message = message,
            title = stringResource(R.string.picking_feedback_success),
            tone = PdaFeedbackTone.Success
        )
    }
}

@Composable
private fun PickingTaskCard(
    task: PickingTaskSummary,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = stringResource(R.string.menu_picking),
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = task.taskNumber,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                }

                StatusChip(status = task.status)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactInfoRow(
                    stringResource(R.string.picking_task_type_label),
                    taskTypeLabel(task.taskType),
                    modifier = Modifier.weight(1f)
                )
                CompactInfoRow(
                    stringResource(R.string.picking_order_count_label),
                    task.orderCount.toString(),
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactInfoRow(
                    stringResource(R.string.picking_location_count_label),
                    task.locationCount.toString(),
                    modifier = Modifier.weight(1f)
                )
                CompactInfoRow(
                    stringResource(R.string.picking_sku_count_label),
                    task.skuCount.toString(),
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactInfoRow(
                    stringResource(R.string.picking_list_qty_progress_label),
                    stringResource(
                        R.string.picking_progress_format,
                        task.pickedQty,
                        task.totalQty
                    ),
                    modifier = Modifier.weight(1f)
                )
                CompactInfoRow(
                    stringResource(R.string.picking_channel_label),
                    task.channel ?: stringResource(R.string.picking_value_placeholder),
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactInfoRow(
                    stringResource(R.string.picking_created_at_label),
                    formatDisplayTime(task.createdAt),
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun PickingPrepareTaskCard(task: PickingTaskDetail) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(
                        text = stringResource(R.string.picking_task_number_label),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 12.sp
                    )
                    Text(
                        text = task.taskNumber,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp
                    )
                }
                StatusChip(status = task.status)
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactInfoRow(
                    stringResource(R.string.picking_task_type_label),
                    taskTypeLabel(task.taskType),
                    modifier = Modifier.weight(1f)
                )
                CompactInfoRow(
                    stringResource(R.string.picking_progress_label),
                    stringResource(R.string.picking_progress_format, task.pickedQty, task.totalQty),
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactInfoRow(
                    stringResource(R.string.picking_channel_label),
                    task.channel ?: stringResource(R.string.picking_value_placeholder),
                    modifier = Modifier.weight(1f)
                )
                CompactInfoRow(
                    stringResource(R.string.picking_downstream_area_label),
                    task.downstreamArea,
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun PickingTaskHeaderCard(task: PickingTaskDetail) {
    Card {
        Column(
            modifier = Modifier.padding(10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            PickingInfoRow(stringResource(R.string.picking_task_number_label), task.taskNumber)
            PickingInfoRow(stringResource(R.string.picking_task_type_label), taskTypeLabel(task.taskType))
            PickingInfoRow(stringResource(R.string.picking_status_label), statusLabel(task.status))
            PickingInfoRow(
                stringResource(R.string.picking_container_label),
                task.targetContainer ?: stringResource(R.string.picking_value_placeholder)
            )
            PickingInfoRow(
                stringResource(R.string.picking_progress_label),
                stringResource(R.string.picking_progress_format, task.pickedQty, task.totalQty)
            )
            PickingInfoRow(stringResource(R.string.picking_downstream_area_label), task.downstreamArea)
        }
    }
}

@Composable
private fun PickingWorkingTaskBar(
    task: PickingTaskDetail,
    onShowProgressDialog: () -> Unit
) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.65f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.Top
        ) {
            CompactInfoRow(
                label = stringResource(R.string.picking_task_number_label),
                value = task.taskNumber,
                modifier = Modifier.weight(1f)
            )
            CompactInfoRow(
                label = stringResource(R.string.picking_progress_label),
                value = stringResource(R.string.picking_progress_format, task.pickedQty, task.totalQty),
                modifier = Modifier.weight(0.8f)
            )
        }
    }
}

@Composable
private fun PickingCurrentLineCard(
    task: PickingTaskDetail?,
    line: PickingLine
) {
    val groupedPendingQty = pendingQtyForLocationSku(task, line)

    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 5.dp),
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.Top
            ) {
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(1.dp)
                ) {
                    Text(
                        text = stringResource(R.string.picking_location_label),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 10.sp
                    )
                    Text(
                        text = line.locationCode,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp
                    )
                }
                CompactMetricChip(
                    label = stringResource(R.string.picking_grouped_pending_qty_label),
                    value = groupedPendingQty.toString()
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CompactInfoRow(
                    stringResource(R.string.picking_sku_code_label),
                    line.skuCode,
                    modifier = Modifier.weight(1f)
                )
                CompactInfoRow(
                    stringResource(R.string.picking_barcode_label),
                    line.barcode ?: stringResource(R.string.picking_value_placeholder),
                    modifier = Modifier.weight(1f)
                )
            }

            CompactInfoRow(
                stringResource(R.string.picking_sku_name_label),
                line.skuName
            )
        }
    }
}

@Composable
private fun PickingInfoRow(
    label: String,
    value: String
) {
    Column {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 12.sp
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value.ifBlank { stringResource(R.string.picking_value_placeholder) },
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Medium,
            fontSize = 16.sp
        )
    }
}

@Composable
private fun CompactInfoRow(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(1.dp)
    ) {
        Text(
            text = label,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 11.sp
        )
        Text(
            text = value.ifBlank { stringResource(R.string.picking_value_placeholder) },
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Medium,
            fontSize = 13.sp
        )
    }
}

@Composable
private fun CompactMetricChip(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.92f)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 5.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(1.dp)
        ) {
            Text(
                text = label,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 9.sp
            )
            Text(
                text = value,
                color = MaterialTheme.colorScheme.onSurface,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }
    }
}

@Composable
private fun StatusChip(status: String) {
    val label = statusLabel(status)
    val containerColor = if (status == "IN_PROGRESS") {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.secondaryContainer
    }
    val contentColor = if (status == "IN_PROGRESS") {
        MaterialTheme.colorScheme.onPrimary
    } else {
        MaterialTheme.colorScheme.onSecondaryContainer
    }

    Surface(shape = RoundedCornerShape(10.dp), color = containerColor) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
            color = contentColor,
            fontWeight = FontWeight.Bold
        )
    }
}

private data class PickingProgressRow(
    val locationCode: String,
    val skuCode: String,
    val pendingQty: Int,
    val pickedQty: Int
)

private data class PendingPickingShortageSubmit(
    val locationCode: String,
    val skuBarcode: String,
    val actualQtyInput: String,
    val shortageQty: Int
)

@Composable
private fun PickingProgressDialog(
    task: PickingTaskDetail,
    onDismiss: () -> Unit
) {
    val progressRows = remember(task.lines) { buildPickingProgressRows(task.lines) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.picking_progress_dialog_title)) },
        text = {
            if (progressRows.isEmpty()) {
                Text(text = stringResource(R.string.picking_progress_dialog_empty))
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(max = 320.dp)
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    PickingProgressRowHeader()
                    progressRows.forEach { row ->
                        PickingProgressRowItem(row = row)
                    }
                }
            }
        },
        confirmButton = {
            PdaButton(
                text = stringResource(R.string.common_confirm),
                onClick = onDismiss,
                fillMaxWidth = false,
                modifier = Modifier.width(112.dp)
            )
        }
    )
}

@Composable
private fun PickingProgressRowHeader() {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.75f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = stringResource(R.string.picking_location_label),
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = stringResource(R.string.picking_sku_code_label),
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = stringResource(R.string.picking_pending_qty_label),
                modifier = Modifier.weight(0.9f),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
                textAlign = TextAlign.End,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = stringResource(R.string.picking_picked_qty_label),
                modifier = Modifier.weight(0.9f),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp,
                textAlign = TextAlign.End,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun PickingProgressRowItem(row: PickingProgressRow) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surface
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 7.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = row.locationCode,
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 12.sp
            )
            Text(
                text = row.skuCode,
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 12.sp
            )
            Text(
                text = row.pendingQty.toString(),
                modifier = Modifier.weight(0.9f),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 12.sp,
                textAlign = TextAlign.End
            )
            Text(
                text = row.pickedQty.toString(),
                modifier = Modifier.weight(0.9f),
                color = MaterialTheme.colorScheme.onSurface,
                fontSize = 12.sp,
                textAlign = TextAlign.End
            )
        }
    }
}

private fun pendingQtyForLocationSku(task: PickingTaskDetail?, line: PickingLine): Int {
    val lines = task?.lines ?: return line.remainingQty
    return lines
        .filter { it.locationCode == line.locationCode && it.skuCode == line.skuCode }
        .sumOf { it.remainingQty.coerceAtLeast(0) }
}

private fun buildPickingProgressRows(lines: List<PickingLine>): List<PickingProgressRow> {
    val grouped = linkedMapOf<Pair<String, String>, MutableList<PickingLine>>()
    lines.forEach { line ->
        grouped.getOrPut(line.locationCode to line.skuCode) { mutableListOf() }.add(line)
    }

    return grouped.map { (key, groupedLines) ->
        PickingProgressRow(
            locationCode = key.first,
            skuCode = key.second,
            pendingQty = groupedLines.sumOf { it.remainingQty.coerceAtLeast(0) },
            pickedQty = groupedLines.sumOf { it.pickedQty.coerceAtLeast(0) }
        )
    }
}

@Composable
private fun PickingShortageConfirmDialog(
    shortageQty: Int,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.picking_shortage_dialog_title)) },
        text = {
            Text(
                text = stringResource(
                    R.string.picking_shortage_dialog_message_format,
                    shortageQty
                )
            )
        },
        confirmButton = {
            PdaButton(
                text = stringResource(R.string.picking_shortage_dialog_confirm),
                onClick = onConfirm,
                fillMaxWidth = false,
                modifier = Modifier.width(128.dp)
            )
        },
        dismissButton = {
            PdaButton(
                text = stringResource(R.string.common_cancel),
                onClick = onDismiss,
                fillMaxWidth = false,
                modifier = Modifier.width(112.dp),
                variant = PdaButtonVariant.Secondary
            )
        }
    )
}

@Composable
private fun PickingCompleteDialog(
    task: PickingTaskDetail,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(text = stringResource(R.string.picking_complete_dialog_title)) },
        text = {
            Text(
                text = if (task.totalShortQty > 0) {
                    stringResource(
                        R.string.picking_complete_shortage_dialog_message_format,
                        task.pickedQty,
                        task.totalShortQty
                    )
                } else {
                    stringResource(
                        R.string.picking_complete_dialog_message_format,
                        task.pickedQty,
                        task.totalShortQty,
                        task.downstreamArea
                    )
                }
            )
        },
        confirmButton = {
            PdaButton(
                text = stringResource(R.string.common_confirm),
                onClick = onConfirm,
                fillMaxWidth = false,
                modifier = Modifier.width(112.dp)
            )
        },
        dismissButton = {
            PdaButton(
                text = stringResource(R.string.common_cancel),
                onClick = onDismiss,
                fillMaxWidth = false,
                modifier = Modifier.width(112.dp),
                variant = PdaButtonVariant.Secondary
            )
        }
    )
}

@Composable
private fun taskTypeLabel(taskType: String): String {
    return when (taskType) {
        "SINGLE_ONE_HOT" -> stringResource(R.string.picking_task_type_single_one_hot)
        "SINGLE_ONE_NORMAL" -> stringResource(R.string.picking_task_type_single_one_normal)
        "SINGLE_MULTI_HOT" -> stringResource(R.string.picking_task_type_single_multi_hot)
        "SINGLE_MULTI_NORMAL" -> stringResource(R.string.picking_task_type_single_multi_normal)
        "MULTI_FIXED_COMBO" -> stringResource(R.string.picking_task_type_multi_fixed_combo)
        "MULTI_NON_FIXED" -> stringResource(R.string.picking_task_type_multi_non_fixed)
        else -> taskType
    }
}

@Composable
private fun statusLabel(status: String): String {
    return when (status) {
        "IN_PROGRESS" -> stringResource(R.string.picking_status_in_progress)
        "PICKED" -> stringResource(R.string.picking_status_picked)
        else -> stringResource(R.string.picking_status_pending)
    }
}

private fun formatDisplayTime(value: String): String {
    return value.replace('T', ' ').take(16)
}
