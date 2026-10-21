package com.kec.wms.pda.presentation.receiving

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.AvailableBatchLineOption
import com.kec.wms.pda.data.model.SkuInfo
import com.kec.wms.pda.presentation.common.PdaBottomActionBar
import com.kec.wms.pda.presentation.common.PdaBottomBarPrimaryButton
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaSelectionButton
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

private const val ScreenQualityGood = "GOOD"
private const val ScreenQualityDamaged = "DAMAGED"
private val ReceivingPageHorizontalPadding = 12.dp
private val ReceivingPageVerticalPadding = 10.dp
private val ReceivingSectionSpacing = 10.dp
private val ReceivingCardPadding = 10.dp
private val ReceivingFieldSpacing = 8.dp
private val ReceivingInputHeight = 60.dp
private val ReceivingActionHeight = 48.dp

@Composable
fun ReceivingOperationScreen(
    uiState: ReceivingUiState,
    onAsnNumberChange: (String) -> Unit,
    onLoadAsn: (String) -> Unit,
    onContainerCodeChange: (String) -> Unit,
    onScanContainer: (String) -> Unit,
    onSkuCodeChange: (String) -> Unit,
    onScanSku: (String) -> Unit,
    onReceivedQtyChange: (String) -> Unit,
    onQualityStatusChange: (String) -> Unit,
    onBatchLineSelected: (String) -> Unit,
    onExpiryDateChange: (String) -> Unit,
    onCaptureFirstReceiving: (Boolean, Double, Double, Double, Double) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val asnFocus = remember { FocusRequester() }
    val containerFocus = remember { FocusRequester() }
    val skuFocus = remember { FocusRequester() }
    val qtyFocus = remember { FocusRequester() }
    val isContainerMode = uiState.receivingMode == RECEIVING_MODE_CONTAINER
    val isBusy = uiState.isLoading || uiState.submitAction.isRunning || uiState.isCapturingFirstReceiving
    val showSubmitAction = if (isContainerMode) {
        !uiState.containerId.isNullOrBlank() && (uiState.currentSku != null || uiState.containerHasPendingClose)
    } else {
        uiState.currentSku != null && uiState.matchedLine != null
    }

    LaunchedEffect(
        uiState.asnDetail?.id,
        uiState.containerId,
        uiState.currentSku?.id,
        uiState.matchedLine?.id,
        uiState.showFirstReceivingDialog,
        uiState.receivingMode,
        uiState.skuRefocusVersion
    ) {
        if (uiState.showFirstReceivingDialog) return@LaunchedEffect

        when {
            uiState.asnDetail == null -> asnFocus.requestFocusSafely()
            isContainerMode && uiState.containerId.isNullOrBlank() -> containerFocus.requestFocusSafely()
            uiState.currentSku == null || uiState.matchedLine == null -> skuFocus.requestFocusSafely()
            else -> qtyFocus.requestFocusSafely()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        topBar = {
            PdaTopBar(
                title = stringResource(
                    if (isContainerMode) {
                        R.string.receiving_container_title
                    } else {
                        R.string.receiving_sku_title
                    }
                ),
                onBack = onBack
            )
        },
        bottomBar = {
            if (showSubmitAction) {
                ReceivingBottomBar(
                    isBusy = isBusy,
                    isSaveEnabled = !uiState.showFirstReceivingDialog,
                    actionText = if (isContainerMode && uiState.containerHasPendingClose && uiState.currentSku == null) {
                        stringResource(R.string.receiving_close_action)
                    } else if (isContainerMode) {
                        stringResource(R.string.receiving_submit_close_action)
                    } else {
                        stringResource(R.string.receiving_save_continue)
                    },
                    onSubmit = onSubmit
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(
                    horizontal = ReceivingPageHorizontalPadding,
                    vertical = ReceivingPageVerticalPadding
                )
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(ReceivingSectionSpacing)
        ) {
            uiState.error?.let {
                PdaFeedbackBanner(
                    title = stringResource(R.string.receiving_feedback_error),
                    message = it,
                    tone = PdaFeedbackTone.Error
                )
            }

            uiState.successMessage?.let {
                PdaFeedbackBanner(
                    title = stringResource(R.string.receiving_feedback_success),
                    message = it,
                    tone = PdaFeedbackTone.Success
                )
            }

            ReceivingInputCard(
                uiState = uiState,
                isContainerMode = isContainerMode,
                isBusy = isBusy,
                asnFocus = asnFocus,
                containerFocus = containerFocus,
                skuFocus = skuFocus,
                onAsnNumberChange = onAsnNumberChange,
                onLoadAsn = onLoadAsn,
                onContainerCodeChange = onContainerCodeChange,
                onScanContainer = onScanContainer,
                onSkuCodeChange = onSkuCodeChange,
                onScanSku = onScanSku
            )

            if (uiState.currentSku != null && uiState.matchedLine != null) {
                ReceivingFormCard(
                    uiState = uiState,
                    qtyFocus = qtyFocus,
                    isBusy = isBusy,
                    onReceivedQtyChange = onReceivedQtyChange,
                    onQualityStatusChange = onQualityStatusChange,
                    onBatchLineSelected = onBatchLineSelected,
                    onExpiryDateChange = onExpiryDateChange
                )
            }

            if (isBusy) {
                Box(
                    modifier = Modifier.fillMaxWidth(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(36.dp))
                }
            }

            Spacer(modifier = Modifier.height(4.dp))
        }
    }

    if (uiState.showFirstReceivingDialog && uiState.currentSku != null) {
        FirstReceivingDialog(
            sku = uiState.currentSku,
            errorMessage = uiState.error,
            isSaving = uiState.isCapturingFirstReceiving,
            onSave = onCaptureFirstReceiving
        )
    }
}

@Composable
private fun ReceivingInputCard(
    uiState: ReceivingUiState,
    isContainerMode: Boolean,
    isBusy: Boolean,
    asnFocus: FocusRequester,
    containerFocus: FocusRequester,
    skuFocus: FocusRequester,
    onAsnNumberChange: (String) -> Unit,
    onLoadAsn: (String) -> Unit,
    onContainerCodeChange: (String) -> Unit,
    onScanContainer: (String) -> Unit,
    onSkuCodeChange: (String) -> Unit,
    onScanSku: (String) -> Unit
) {
    Card(
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
        )
    ) {
        Column(
            modifier = Modifier.padding(ReceivingCardPadding),
            verticalArrangement = Arrangement.spacedBy(ReceivingFieldSpacing)
        ) {
            PdaTextField(
                value = uiState.asnNumber,
                onValueChange = onAsnNumberChange,
                focusRequester = asnFocus,
                label = stringResource(R.string.receiving_asn_label),
                imeAction = if (isContainerMode) ImeAction.Next else ImeAction.Done,
                onImeAction = { onLoadAsn(uiState.asnNumber) },
                submitOnLineBreak = true,
                onLineBreakSubmit = onLoadAsn,
                enabled = !isBusy && uiState.asnDetail == null,
                suppressSoftKeyboardOnFocus = true,
                height = ReceivingInputHeight
            )

            if (isContainerMode) {
                PdaTextField(
                    value = uiState.containerCode,
                    onValueChange = onContainerCodeChange,
                    focusRequester = containerFocus,
                    label = stringResource(R.string.receiving_container_label),
                    imeAction = ImeAction.Next,
                    onImeAction = { onScanContainer(uiState.containerCode) },
                    submitOnLineBreak = true,
                    onLineBreakSubmit = onScanContainer,
                    enabled = !isBusy && uiState.asnDetail != null,
                    suppressSoftKeyboardOnFocus = true,
                    height = ReceivingInputHeight
                )
            }

            PdaTextField(
                value = uiState.skuCode,
                onValueChange = onSkuCodeChange,
                focusRequester = skuFocus,
                label = stringResource(R.string.receiving_sku_label),
                imeAction = ImeAction.Done,
                onImeAction = { onScanSku(uiState.skuCode) },
                submitOnLineBreak = true,
                onLineBreakSubmit = onScanSku,
                enabled = !isBusy && uiState.asnDetail != null && (!isContainerMode || !uiState.containerId.isNullOrBlank()),
                suppressSoftKeyboardOnFocus = true,
                height = ReceivingInputHeight
            )
        }
    }
}

@Composable
private fun ReceivingFormCard(
    uiState: ReceivingUiState,
    qtyFocus: FocusRequester,
    isBusy: Boolean,
    onReceivedQtyChange: (String) -> Unit,
    onQualityStatusChange: (String) -> Unit,
    onBatchLineSelected: (String) -> Unit,
    onExpiryDateChange: (String) -> Unit
) {
    val currentSku = uiState.currentSku ?: return
    val expiryLabel = if (currentSku.isExpiryManaged) {
        stringResource(R.string.receiving_expiry_label_required)
    } else {
        stringResource(R.string.receiving_expiry_label_optional)
    }

    Card(
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
        ),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier.padding(ReceivingCardPadding),
            verticalArrangement = Arrangement.spacedBy(ReceivingFieldSpacing)
        ) {
            SummaryRow(
                label = stringResource(R.string.receiving_sku_name_summary),
                value = currentSku.skuName,
                emphasize = false,
                maxLines = 2
            )
            SummaryRow(
                label = stringResource(R.string.receiving_remaining_qty_summary),
                value = uiState.remainingQty.toString(),
                emphasize = true
            )

            if (currentSku.isBatchManaged || uiState.batchNumber.isNotBlank()) {
                BatchSelector(
                    value = uiState.batchNumber,
                    options = uiState.availableBatchLines,
                    selectedId = uiState.selectedBatchLineId,
                    enabled = !isBusy,
                    onSelected = onBatchLineSelected
                )
            }

            if (currentSku.isExpiryManaged || uiState.expiryDate.isNotBlank()) {
                DatePickerField(
                    label = expiryLabel,
                    value = uiState.expiryDate,
                    enabled = !isBusy,
                    onValueChange = onExpiryDateChange
                )
            }

            PdaTextField(
                value = uiState.receivedQty,
                onValueChange = onReceivedQtyChange,
                focusRequester = qtyFocus,
                label = stringResource(R.string.receiving_qty_label),
                keyboardType = KeyboardType.Number,
                imeAction = ImeAction.Done,
                enabled = !isBusy,
                suppressSoftKeyboardOnFocus = true,
                height = ReceivingInputHeight
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QualityStatusButton(
                    text = ScreenQualityGood,
                    selected = uiState.qualityStatus == ScreenQualityGood,
                    onClick = { onQualityStatusChange(ScreenQualityGood) },
                    selectedContainerColor = Color(0xFFEAF6EE),
                    selectedContentColor = Color(0xFF2E7D32),
                    modifier = Modifier.weight(1f)
                )
                QualityStatusButton(
                    text = ScreenQualityDamaged,
                    selected = uiState.qualityStatus == ScreenQualityDamaged,
                    onClick = { onQualityStatusChange(ScreenQualityDamaged) },
                    selectedContainerColor = Color(0xFFF9EAEA),
                    selectedContentColor = Color(0xFFC62828),
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun BatchSelector(
    value: String,
    options: List<AvailableBatchLineOption>,
    selectedId: String?,
    enabled: Boolean,
    onSelected: (String) -> Unit
) {
    val title = stringResource(R.string.receiving_batch_label_required)
    var expanded by remember { mutableStateOf(false) }
    val selectedOption = options.firstOrNull { it.id == selectedId } ?: options.firstOrNull()
    val displayBatchNumber = selectedOption?.batchNumber.orEmpty().ifBlank { value.ifBlank { "-" } }
    val displayRemainingQty = selectedOption?.remainingQty

    Box(modifier = Modifier.fillMaxWidth()) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = enabled && options.size > 1) { expanded = true },
            shape = RoundedCornerShape(6.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.65f)),
            color = MaterialTheme.colorScheme.surface
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(ReceivingInputHeight)
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = displayBatchNumber,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Medium,
                        fontSize = 18.sp
                    )
                    displayRemainingQty?.let { qty ->
                        Text(
                            text = stringResource(
                                R.string.receiving_batch_remaining_format,
                                qty
                            ),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 13.sp
                        )
                    }
                }
                if (options.size > 1) {
                    Text(
                        text = stringResource(R.string.common_confirm),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Surface(
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .padding(start = 12.dp)
                .offset(y = (-8).dp)
        ) {
            Text(
                text = title,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }

        if (expanded && options.size > 1) {
            Dialog(
                onDismissRequest = { expanded = false },
                properties = DialogProperties(
                    dismissOnBackPress = true,
                    dismissOnClickOutside = true
                )
            ) {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = title,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        options.forEach { option ->
                            val isSelected = option.id == selectedId
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        expanded = false
                                        onSelected(option.id)
                                    },
                                shape = RoundedCornerShape(12.dp),
                                color = if (isSelected) {
                                    MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
                                } else {
                                    MaterialTheme.colorScheme.surfaceVariant
                                },
                                border = BorderStroke(
                                    1.dp,
                                    if (isSelected) {
                                        MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
                                    } else {
                                        MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
                                    }
                                )
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = option.batchNumber.orEmpty().ifBlank { "-" },
                                        fontSize = 17.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = stringResource(
                                            R.string.receiving_batch_remaining_format,
                                            option.remainingQty
                                        ),
                                        fontSize = 13.sp,
                                        color = if (isSelected) {
                                            MaterialTheme.colorScheme.primary
                                        } else {
                                            MaterialTheme.colorScheme.onSurfaceVariant
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryRow(
    label: String,
    value: String,
    emphasize: Boolean,
    maxLines: Int = 1
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Text(
            text = "$label:",
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(end = 12.dp)
        )
        Text(
            text = value,
            fontSize = if (emphasize) 18.sp else 15.sp,
            fontWeight = if (emphasize) FontWeight.Bold else FontWeight.SemiBold,
            color = if (emphasize) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            maxLines = maxLines,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
            textAlign = androidx.compose.ui.text.style.TextAlign.End
        )
    }
}

@Composable
private fun QualityStatusButton(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    selectedContainerColor: Color,
    selectedContentColor: Color,
    modifier: Modifier = Modifier
) {
    PdaSelectionButton(
        text = text,
        selected = selected,
        onClick = onClick,
        modifier = modifier,
        selectedContainerColor = selectedContainerColor,
        selectedContentColor = selectedContentColor
    )
}

@Composable
private fun ReceivingBottomBar(
    isBusy: Boolean,
    isSaveEnabled: Boolean,
    actionText: String,
    onSubmit: () -> Unit
) {
    PdaBottomActionBar {
        PdaBottomBarPrimaryButton(
            text = if (isBusy) {
                stringResource(R.string.receiving_save_submitting)
            } else {
                actionText
            },
            onClick = onSubmit,
            enabled = !isBusy && isSaveEnabled,
            isLoading = isBusy
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DatePickerField(
    label: String,
    value: String,
    enabled: Boolean,
    onValueChange: (String) -> Unit
) {
    var showDialog by remember { mutableStateOf(false) }
    val initialMillis = remember(value) { dateTextToMillis(value) }
    val datePickerState = rememberDatePickerState(initialSelectedDateMillis = initialMillis)

    Box(modifier = Modifier.fillMaxWidth()) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = enabled) { showDialog = true },
            shape = RoundedCornerShape(6.dp),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.65f)),
            color = MaterialTheme.colorScheme.surface
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(ReceivingInputHeight)
                    .padding(horizontal = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = value.ifBlank { stringResource(R.string.receiving_expiry_placeholder) },
                    fontSize = 18.sp,
                    color = if (value.isBlank()) {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    } else {
                        MaterialTheme.colorScheme.onSurface
                    }
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (value.isNotBlank()) {
                        Text(
                            text = stringResource(R.string.receiving_clear_container),
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.clickable(enabled = enabled) { onValueChange("") }
                        )
                    }
                    Text(
                        text = stringResource(R.string.common_confirm),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Surface(
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .padding(start = 12.dp)
                .offset(y = (-8).dp)
        ) {
            Text(
                text = label,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 4.dp)
            )
        }
    }

    if (showDialog) {
        DatePickerDialog(
            onDismissRequest = { showDialog = false },
            confirmButton = {
                PdaButton(
                    text = stringResource(R.string.common_confirm),
                    onClick = {
                        onValueChange(millisToDateText(datePickerState.selectedDateMillis))
                        showDialog = false
                    },
                    fillMaxWidth = false
                )
            },
            dismissButton = {
                PdaButton(
                    text = stringResource(R.string.common_cancel),
                    onClick = { showDialog = false },
                    variant = PdaButtonVariant.Secondary,
                    fillMaxWidth = false
                )
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}

@Composable
private fun FirstReceivingDialog(
    sku: SkuInfo,
    errorMessage: String?,
    isSaving: Boolean,
    onSave: (Boolean, Double, Double, Double, Double) -> Unit
) {
    var isSelfPackaged by rememberSaveable(sku.id) { mutableStateOf(sku.isSelfPackaged) }
    var length by rememberSaveable(sku.id) { mutableStateOf(sku.lengthCm?.toString().orEmpty()) }
    var width by rememberSaveable(sku.id) { mutableStateOf(sku.widthCm?.toString().orEmpty()) }
    var height by rememberSaveable(sku.id) { mutableStateOf(sku.heightCm?.toString().orEmpty()) }
    var weight by rememberSaveable(sku.id) { mutableStateOf(sku.weightKg?.toString().orEmpty()) }
    var localError by rememberSaveable(sku.id) { mutableStateOf<String?>(null) }
    val requiredFieldsMessage = stringResource(R.string.receiving_first_receiving_required_fields)

    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false
        )
    ) {
        Card(
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = stringResource(R.string.receiving_first_receiving_title),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = stringResource(R.string.receiving_first_receiving_sku_name_format, sku.skuName),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                (localError ?: errorMessage)?.let {
                    PdaFeedbackBanner(
                        message = it,
                        tone = PdaFeedbackTone.Error
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Checkbox(
                        checked = isSelfPackaged,
                        onCheckedChange = {
                            isSelfPackaged = it
                            localError = null
                        },
                        enabled = !isSaving
                    )
                    Text(
                        text = stringResource(R.string.receiving_first_receiving_self_packaged),
                        modifier = Modifier.padding(start = 8.dp)
                    )
                }

                PdaTextField(
                    value = length,
                    onValueChange = {
                        length = it
                        localError = null
                    },
                    label = stringResource(R.string.receiving_first_receiving_length),
                    keyboardType = KeyboardType.Decimal,
                    enabled = !isSaving,
                    suppressSoftKeyboardOnFocus = false
                )
                PdaTextField(
                    value = width,
                    onValueChange = {
                        width = it
                        localError = null
                    },
                    label = stringResource(R.string.receiving_first_receiving_width),
                    keyboardType = KeyboardType.Decimal,
                    enabled = !isSaving,
                    suppressSoftKeyboardOnFocus = false
                )
                PdaTextField(
                    value = height,
                    onValueChange = {
                        height = it
                        localError = null
                    },
                    label = stringResource(R.string.receiving_first_receiving_height),
                    keyboardType = KeyboardType.Decimal,
                    enabled = !isSaving,
                    suppressSoftKeyboardOnFocus = false
                )
                PdaTextField(
                    value = weight,
                    onValueChange = {
                        weight = it
                        localError = null
                    },
                    label = stringResource(R.string.receiving_first_receiving_weight),
                    keyboardType = KeyboardType.Decimal,
                    enabled = !isSaving,
                    suppressSoftKeyboardOnFocus = false
                )

                PdaButton(
                    text = if (isSaving) {
                        stringResource(R.string.receiving_first_receiving_saving)
                    } else {
                        stringResource(R.string.receiving_first_receiving_save_continue)
                    },
                    onClick = {
                        val lengthValue = length.toDoubleOrNull()
                        val widthValue = width.toDoubleOrNull()
                        val heightValue = height.toDoubleOrNull()
                        val weightValue = weight.toDoubleOrNull()

                        if (lengthValue == null || widthValue == null || heightValue == null || weightValue == null) {
                            localError = requiredFieldsMessage
                            return@PdaButton
                        }

                        onSave(
                            isSelfPackaged,
                            lengthValue,
                            widthValue,
                            heightValue,
                            weightValue
                        )
                    },
                    enabled = !isSaving
                )
            }
        }
    }
}

private fun dateTextToMillis(value: String): Long? {
    if (value.isBlank()) return null
    return try {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        formatter.parse(value)?.time
    } catch (_: Exception) {
        null
    }
}

private fun millisToDateText(value: Long?): String {
    if (value == null) return ""
    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    return formatter.format(value)
}
