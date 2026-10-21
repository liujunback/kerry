package com.kec.wms.pda.presentation.putaway

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.PutawayTask as PutawayTaskData
import com.kec.wms.pda.presentation.common.PdaBottomActionBar
import com.kec.wms.pda.presentation.common.PdaBottomBarPrimaryButton
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely

private object PutawayUiDefaults {
    val CardRadius = RoundedCornerShape(16.dp)
    val ButtonRadius = RoundedCornerShape(16.dp)
    val PagePadding = 12.dp
    val SectionSpacing = 10.dp
    val FieldSpacing = 8.dp
    val ActionButtonHeight = 46.dp
    val InputHeight = 48.dp
    val SoftBorderColor = Color(0xFFE8DED6)
}

private enum class PutawayFocusTarget {
    ORDER,
    SKU,
    LOCATION,
    QUANTITY,
}

@Composable
fun PutawayEntryScreen(
    onOpenSkuPutaway: () -> Unit,
    onOpenContainerPutaway: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        topBar = {
            PdaTopBar(
                title = stringResource(R.string.putaway_title),
                onBack = onBack
            )
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(horizontal = 22.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(modifier = Modifier.height(36.dp))

            PutawayEntryButton(
                title = stringResource(R.string.putaway_entry_sku_action),
                onClick = onOpenSkuPutaway,
            )

            Box(modifier = Modifier.height(36.dp))

            PutawayEntryButton(
                title = stringResource(R.string.putaway_entry_container_action),
                onClick = onOpenContainerPutaway,
            )
        }
    }
}

@Composable
fun PutawaySkuScreen(
    uiState: PutawaySkuUiState,
    onOrderInputChange: (String) -> Unit,
    onLoadOrder: () -> Unit,
    onSkuInputChange: (String) -> Unit,
    onScanSku: () -> Unit,
    onSelectTask: (Int) -> Unit,
    onLocationInputChanged: () -> Unit,
    onLookupLocation: (String) -> Unit,
    onSubmitPutaway: (String) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val isContainerMode = uiState.putawayMode == PUTAWAY_MODE_CONTAINER
    val locationRequiredMessage = stringResource(R.string.putaway_feedback_location_required)
    val invalidQuantityMessage = stringResource(R.string.putaway_feedback_quantity_invalid)
    val scanLabel = if (isContainerMode) {
        stringResource(R.string.putaway_scan_container_label)
    } else {
        stringResource(R.string.putaway_scan_sku_label)
    }
    val orderInputRequester = remember { FocusRequester() }
    val skuInputRequester = remember { FocusRequester() }
    val locationInputRequester = remember { FocusRequester() }
    val quantityInputRequester = remember { FocusRequester() }

    var locationInput by rememberSaveable { mutableStateOf("") }
    var quantityInput by rememberSaveable { mutableStateOf("") }
    var submitFeedbackMessage by rememberSaveable { mutableStateOf<String?>(null) }
    var submitFeedbackTone by remember { mutableStateOf(PdaFeedbackTone.Info) }
    var pendingFocusTarget by rememberSaveable(uiState.putawayMode) {
        mutableStateOf<PutawayFocusTarget?>(if (isContainerMode) PutawayFocusTarget.SKU else PutawayFocusTarget.ORDER)
    }
    var lastOrderId by remember { mutableStateOf<String?>(null) }
    var lastMatchedKey by remember { mutableStateOf("") }

    val order = uiState.order
    val container = uiState.currentContainer
    val containerItem = uiState.currentContainerItem
    val activeTasks = uiState.matchedTasks
    val activeTask = activeTasks.getOrNull(uiState.selectedTaskIndex) ?: activeTasks.firstOrNull()
    val isContainerLoaded = container != null && containerItem != null
    val containerDoneQty = if (isContainerLoaded) {
        (containerItem!!.quantity - containerItem.availableQty).coerceAtLeast(0)
    } else {
        0
    }
    val containerProgress = if (isContainerLoaded && containerItem!!.quantity > 0) {
        containerDoneQty.toFloat() / containerItem.quantity.toFloat()
    } else {
        0f
    }
    val containerTasks = if (isContainerLoaded) {
        listOf(
            PutawayTaskData(
                id = containerItem!!.id,
                putawayTaskNumber = containerItem.id,
                skuId = containerItem.skuId,
                skuCode = containerItem.skuCode,
                skuName = containerItem.skuName,
                barcode = containerItem.barcode,
                status = "PENDING",
                quantity = containerItem.availableQty,
                putawayQty = 0,
                remainingQty = containerItem.availableQty,
                batchNumber = containerItem.batchNumber,
                expiryDate = null,
                qualityType = containerItem.qualityStatus,
                containerId = container?.id,
                isSerialManaged = containerItem.isSerialManaged,
                serialNumbers = containerItem.serialNumbers,
            )
        )
    } else {
        emptyList()
    }
    LaunchedEffect(pendingFocusTarget, order != null, isContainerLoaded) {
        when (pendingFocusTarget) {
            PutawayFocusTarget.ORDER -> {
                if (!isContainerMode && order == null) {
                    orderInputRequester.requestFocusSafely()
                }
            }
            PutawayFocusTarget.SKU -> {
                if (isContainerMode || order != null) {
                    skuInputRequester.requestFocusSafely()
                }
            }
            PutawayFocusTarget.LOCATION -> {
                if (isContainerMode && isContainerLoaded || !isContainerMode && order != null) {
                    locationInputRequester.requestFocusSafely()
                }
            }
            PutawayFocusTarget.QUANTITY -> {
                if (isContainerMode && isContainerLoaded || !isContainerMode && order != null) {
                    quantityInputRequester.requestFocusSafely()
                }
            }
            null -> Unit
        }
        if (pendingFocusTarget != null) {
            pendingFocusTarget = null
        }
    }

    LaunchedEffect(order?.id, uiState.putawayMode) {
        if (!isContainerMode && order?.id != null && order.id != lastOrderId) {
            lastOrderId = order.id
            locationInput = ""
            quantityInput = ""
            submitFeedbackMessage = null
            pendingFocusTarget = PutawayFocusTarget.SKU
        } else if (order == null) {
            lastOrderId = null
        }
    }

    LaunchedEffect(activeTasks.joinToString(",") { it.id }, uiState.selectedTaskIndex, uiState.putawayMode, container?.id) {
        if (isContainerMode) {
            if (container?.id != null && containerItem != null) {
                locationInput = ""
                quantityInput = ""
                pendingFocusTarget = PutawayFocusTarget.LOCATION
            }
            return@LaunchedEffect
        }

        val currentMatchKey = activeTasks.joinToString(",") { it.id }
        if (activeTask != null) {
            quantityInput = ""
        }
        if (currentMatchKey.isNotEmpty() && currentMatchKey != lastMatchedKey) {
            locationInput = ""
            pendingFocusTarget = PutawayFocusTarget.LOCATION
        }
        lastMatchedKey = currentMatchKey
    }

    LaunchedEffect(uiState.currentLocation?.id) {
        if (uiState.currentLocation?.id != null) {
            pendingFocusTarget = PutawayFocusTarget.QUANTITY
        }
    }

    LaunchedEffect(uiState.successMessage, uiState.putawayMode, isContainerLoaded) {
        if (!uiState.successMessage.isNullOrBlank()) {
            locationInput = ""
            quantityInput = ""
            submitFeedbackMessage = null
            lastMatchedKey = ""
            pendingFocusTarget = if (isContainerMode && isContainerLoaded) {
                PutawayFocusTarget.LOCATION
            } else {
                PutawayFocusTarget.SKU
            }
        }
    }

    Scaffold(
        topBar = {
            PdaTopBar(
                title = if (isContainerMode) {
                    stringResource(R.string.putaway_container_title)
                } else {
                    stringResource(R.string.putaway_sku_title)
                },
                onBack = onBack
            )
        },
        bottomBar = {
            PutawayBottomBar {
                if (isContainerMode && !isContainerLoaded) {
                    PutawayPrimaryButton(
                        text = stringResource(R.string.common_confirm),
                        enabled = uiState.skuInput.isNotBlank() && !uiState.isLoading,
                        onClick = onScanSku,
                    )
                } else if (!isContainerMode && order == null) {
                    PutawayPrimaryButton(
                        text = stringResource(R.string.common_confirm),
                        enabled = uiState.orderInput.isNotBlank() && !uiState.isLoading,
                        onClick = onLoadOrder,
                    )
                } else {
                    PutawayPrimaryButton(
                        text = if (uiState.submitAction.isRunning) {
                            stringResource(R.string.putaway_submit_submitting)
                        } else {
                            stringResource(R.string.putaway_submit_action)
                        },
                        enabled = if (isContainerMode) {
                            containerItem != null && quantityInput.isNotBlank() && !uiState.submitAction.isRunning
                        } else {
                            activeTask != null && quantityInput.isNotBlank() && !uiState.submitAction.isRunning
                        },
                        isLoading = uiState.submitAction.isRunning,
                        onClick = {
                            val quantity = quantityInput.toIntOrNull()
                            submitFeedbackMessage = when {
                                locationInput.isBlank() -> locationRequiredMessage
                                quantity == null || quantity <= 0 -> invalidQuantityMessage
                                else -> null
                            }

                            if (submitFeedbackMessage == null) {
                                onSubmitPutaway(quantityInput)
                            } else {
                                submitFeedbackTone = PdaFeedbackTone.Error
                            }
                        },
                    )
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(PutawayUiDefaults.PagePadding),
            verticalArrangement = Arrangement.spacedBy(PutawayUiDefaults.SectionSpacing),
        ) {
            uiState.error?.let {
                PdaFeedbackBanner(
                    message = it,
                    tone = PdaFeedbackTone.Error,
                )
            } ?: uiState.successMessage?.let {
                PdaFeedbackBanner(
                    message = it,
                    tone = PdaFeedbackTone.Success,
                )
            } ?: submitFeedbackMessage?.let {
                PdaFeedbackBanner(
                    message = it,
                    tone = submitFeedbackTone,
                )
            }

            if (isContainerMode) {
                PutawayInputCard {
                    PdaTextField(
                        value = uiState.skuInput,
                        onValueChange = {
                            onSkuInputChange(it)
                            submitFeedbackMessage = null
                            if (it.isBlank()) {
                                locationInput = ""
                                quantityInput = ""
                                pendingFocusTarget = PutawayFocusTarget.SKU
                            }
                        },
                        focusRequester = skuInputRequester,
                        label = scanLabel,
                        imeAction = ImeAction.Done,
                        onImeAction = onScanSku,
                        submitOnLineBreak = true,
                        onLineBreakSubmit = { onScanSku() },
                        height = PutawayUiDefaults.InputHeight
                    )
                }
                if (isContainerLoaded) {
                    PutawaySummaryCard(
                        lines = listOf(
                            stringResource(R.string.putaway_container_number_label) to container!!.containerCode,
                        ),
                        progress = containerProgress,
                        progressLabel = stringResource(
                            R.string.putaway_progress_format,
                            containerDoneQty,
                            containerItem!!.quantity,
                        ),
                    )

                    PutawayInputCard {
                        PutawayTaskSelector(
                            tasks = containerTasks,
                            selectedIndex = 0,
                            onSelected = { },
                        )
                    }

                    PutawayInputCard {
                        PdaTextField(
                            value = locationInput,
                            onValueChange = { newValue ->
                                locationInput = newValue
                                submitFeedbackMessage = null
                                onLocationInputChanged()
                            },
                            focusRequester = locationInputRequester,
                            label = stringResource(R.string.putaway_location_label),
                            imeAction = ImeAction.Next,
                            onImeAction = { onLookupLocation(locationInput) },
                            height = PutawayUiDefaults.InputHeight,
                            submitOnLineBreak = true,
                            onLineBreakSubmit = onLookupLocation
                        )

                        Box(modifier = Modifier.height(PutawayUiDefaults.FieldSpacing))

                        PdaTextField(
                            value = quantityInput,
                            onValueChange = {
                                quantityInput = it
                                submitFeedbackMessage = null
                            },
                            focusRequester = quantityInputRequester,
                            label = stringResource(R.string.putaway_quantity_label),
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Done,
                            onImeAction = { },
                            height = PutawayUiDefaults.InputHeight
                        )
                    }
                }
            } else if (order == null) {
                PutawayInputCard {
                    PdaTextField(
                        value = uiState.orderInput,
                        onValueChange = {
                            onOrderInputChange(it)
                            submitFeedbackMessage = null
                        },
                        focusRequester = orderInputRequester,
                        label = stringResource(R.string.putaway_order_placeholder),
                        imeAction = ImeAction.Done,
                        onImeAction = onLoadOrder,
                        submitOnLineBreak = true,
                        onLineBreakSubmit = { onLoadOrder() },
                        height = PutawayUiDefaults.InputHeight
                    )
                }
            } else {
                PutawayOrderCompactCard(
                    orderNumber = order.putawayOrderNumber,
                    progress = if (order.totalQty == 0) 0f else order.putawayQty.toFloat() / order.totalQty.toFloat(),
                    progressLabel = stringResource(
                        R.string.putaway_progress_format,
                        order.putawayQty,
                        order.totalQty,
                    ),
                )

                PutawayInputCard {
                    PdaTextField(
                        value = uiState.skuInput,
                        onValueChange = {
                            onSkuInputChange(it)
                            submitFeedbackMessage = null
                            if (it.isBlank()) {
                                locationInput = ""
                                quantityInput = ""
                            }
                            if (it.isBlank()) {
                                pendingFocusTarget = PutawayFocusTarget.SKU
                            }
                        },
                        focusRequester = skuInputRequester,
                        label = scanLabel,
                        imeAction = ImeAction.Next,
                        onImeAction = onScanSku,
                        submitOnLineBreak = true,
                        onLineBreakSubmit = { onScanSku() },
                        height = PutawayUiDefaults.InputHeight
                    )

                    if (activeTasks.isNotEmpty()) {
                        Box(modifier = Modifier.height(PutawayUiDefaults.FieldSpacing))
                        PutawayTaskSelector(
                            tasks = activeTasks,
                            selectedIndex = uiState.selectedTaskIndex,
                            onSelected = onSelectTask,
                        )
                    }

                    Box(modifier = Modifier.height(PutawayUiDefaults.FieldSpacing))

                    PdaTextField(
                        value = locationInput,
                        onValueChange = { newValue ->
                            locationInput = newValue
                            submitFeedbackMessage = null
                            onLocationInputChanged()
                        },
                        focusRequester = locationInputRequester,
                        label = stringResource(R.string.putaway_location_label),
                        imeAction = ImeAction.Next,
                        onImeAction = { onLookupLocation(locationInput) },
                        height = PutawayUiDefaults.InputHeight,
                        submitOnLineBreak = true,
                        onLineBreakSubmit = onLookupLocation
                    )

                    Box(modifier = Modifier.height(PutawayUiDefaults.FieldSpacing))

                    PdaTextField(
                        value = quantityInput,
                        onValueChange = {
                            quantityInput = it
                            submitFeedbackMessage = null
                        },
                        focusRequester = quantityInputRequester,
                        label = stringResource(R.string.putaway_quantity_label),
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done,
                        onImeAction = { },
                        height = PutawayUiDefaults.InputHeight
                    )
                }
            }
        }
    }
}

@Composable
private fun PutawayEntryButton(
    title: String,
    onClick: () -> Unit,
) {
    PdaButton(
        text = title,
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp)
    )
}

@Composable
private fun PutawayInputCard(
    title: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        shape = PutawayUiDefaults.CardRadius,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            title?.let {
                Text(
                    text = it,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
            content()
        }
    }
}

@Composable
private fun PutawaySummaryCard(
    lines: List<Pair<String, String>>,
    progress: Float? = null,
    progressLabel: String? = null,
) {
    Card(
        shape = PutawayUiDefaults.CardRadius,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            lines.forEach { (label, value) ->
                PutawaySummaryRow(
                    label = label,
                    value = value,
                    emphasize = label == stringResource(R.string.putaway_summary_progress),
                )
            }

            if (progress != null && progressLabel != null) {
                LinearProgressIndicator(
                    progress = { progress.coerceIn(0f, 1f) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(999.dp)),
                    color = MaterialTheme.colorScheme.primary,
                    trackColor = MaterialTheme.colorScheme.primaryContainer,
                )
                Text(
                    text = progressLabel,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.End,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
    }
}

@Composable
private fun PutawayOrderCompactCard(
    orderNumber: String,
    progress: Float,
    progressLabel: String,
) {
    Card(
        shape = PutawayUiDefaults.CardRadius,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PutawaySummaryRow(
                label = stringResource(R.string.putaway_summary_order_number),
                value = orderNumber,
            )
            PutawaySummaryRow(
                label = stringResource(R.string.putaway_summary_progress),
                value = progressLabel,
                emphasize = true,
            )
            LinearProgressIndicator(
                progress = { progress.coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(999.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.primaryContainer,
            )
        }
    }
}

@Composable
private fun PutawaySummaryRow(
    label: String,
    value: String,
    emphasize: Boolean = false,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = label,
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Text(
            text = value,
            fontSize = 14.sp,
            textAlign = TextAlign.End,
            fontWeight = if (emphasize) FontWeight.Bold else FontWeight.SemiBold,
            color = if (emphasize) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun PutawayMetaChip(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    emphasize: Boolean = false,
    filled: Boolean = false,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = when {
            emphasize -> MaterialTheme.colorScheme.primaryContainer
            filled -> MaterialTheme.colorScheme.surfaceVariant
            else -> MaterialTheme.colorScheme.surface
        },
        border = if (emphasize || filled) {
            null
        } else {
            BorderStroke(1.dp, PutawayUiDefaults.SoftBorderColor)
        },
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = label,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                text = value,
                fontSize = if (emphasize) 18.sp else 14.sp,
                fontWeight = if (emphasize) FontWeight.Bold else FontWeight.SemiBold,
                color = if (emphasize) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

@Composable
private fun PutawayTaskSelector(
    tasks: List<PutawayTaskData>,
    selectedIndex: Int,
    onSelected: (Int) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        tasks.forEachIndexed { index, task ->
            val selected = index == selectedIndex
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .selectable(selected = selected, onClick = { onSelected(index) }),
                shape = PutawayUiDefaults.CardRadius,
                colors = CardDefaults.cardColors(
                    containerColor = if (selected) {
                        MaterialTheme.colorScheme.primaryContainer
                    } else {
                        MaterialTheme.colorScheme.surface
                    }
                ),
                border = BorderStroke(
                    width = 1.dp,
                    color = if (selected) MaterialTheme.colorScheme.primary else PutawayUiDefaults.SoftBorderColor,
                ),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(if (selected) MaterialTheme.colorScheme.primary else Color.Transparent)
                            .border(
                                width = 1.25.dp,
                                color = MaterialTheme.colorScheme.primary,
                                shape = RoundedCornerShape(999.dp),
                            )
                    )
                    Column(
                        modifier = Modifier
                            .padding(start = 10.dp)
                            .weight(1f),
                        verticalArrangement = Arrangement.spacedBy(if (selected) 3.dp else 0.dp),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = taskDisplayTitle(
                                    batchNumber = task.batchNumber,
                                    expiryDate = task.expiryDate,
                                    fallback = task.skuCode,
                                ),
                                modifier = Modifier.weight(1f),
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface,
                                maxLines = 1,
                            )
                            Surface(
                                shape = RoundedCornerShape(999.dp),
                                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant,
                            ) {
                                Text(
                                    text = stringResource(R.string.putaway_task_pending_format_compact, task.remainingQty),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                )
                            }
                        }
                        if (selected) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text(
                                    text = task.skuName ?: task.skuCode,
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    maxLines = 1,
                                    modifier = Modifier.weight(1f),
                                )
                                PutawayQualityChip(
                                    text = qualityLabelOf(task.qualityType),
                                    selected = true,
                                )
                            }
                        }
                    }
                    if (!selected) {
                        PutawayQualityChip(
                            text = qualityLabelOf(task.qualityType),
                            selected = false,
                            modifier = Modifier.padding(start = 6.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PutawayQualityChip(
    text: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(999.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, if (selected) MaterialTheme.colorScheme.primary else PutawayUiDefaults.SoftBorderColor),
    ) {
        Text(
            text = text,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun PutawayBottomBar(
    content: @Composable ColumnScope.() -> Unit,
) {
    PdaBottomActionBar(content = content)
}

@Composable
private fun PutawayPrimaryButton(
    text: String,
    enabled: Boolean,
    isLoading: Boolean = false,
    onClick: () -> Unit,
) {
    PdaBottomBarPrimaryButton(
        text = text,
        onClick = onClick,
        enabled = enabled,
        isLoading = isLoading,
        height = PutawayUiDefaults.ActionButtonHeight
    )
}

@Composable
private fun qualityLabelOf(qualityType: String): String {
    return when (qualityType.uppercase()) {
        "GOOD" -> stringResource(R.string.putaway_quality_good)
        "DAMAGED" -> stringResource(R.string.putaway_quality_damaged)
        else -> qualityType
    }
}

@Composable
private fun formatExpiryDate(expiryDate: String?): String {
    if (expiryDate.isNullOrBlank()) {
        return stringResource(R.string.putaway_value_placeholder)
    }

    return expiryDate.substringBefore('T').substringBefore(' ')
}

private fun hasDisplayValue(value: String?): Boolean {
    return !value.isNullOrBlank() && value != "-"
}

@Composable
private fun taskDisplayTitle(
    batchNumber: String?,
    expiryDate: String?,
    fallback: String,
): String {
    val parts = buildList {
        if (hasDisplayValue(batchNumber)) add(batchNumber!!.trim())
        val formattedExpiry = formatExpiryDate(expiryDate)
        if (hasDisplayValue(formattedExpiry)) add(formattedExpiry)
    }

    return if (parts.isEmpty()) fallback else parts.joinToString(" / ")
}
