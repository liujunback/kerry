package com.kec.wms.pda.presentation.inventory

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.InventoryCandidate
import com.kec.wms.pda.presentation.common.PdaBottomSheetPicker
import com.kec.wms.pda.presentation.common.PdaBottomActionBar
import com.kec.wms.pda.presentation.common.PdaBottomBarPrimaryButton
import com.kec.wms.pda.presentation.common.PdaActionState
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaPickerOption
import com.kec.wms.pda.presentation.common.PdaSelectionButton
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely
import java.math.BigDecimal
import kotlinx.coroutines.launch

private object InventoryUiCompact {
    val ScreenHorizontalPadding = 8.dp
    val ScreenVerticalPadding = 6.dp
    val SectionSpacing = 6.dp
    val FieldSpacing = 6.dp
    val CardPadding = 8.dp
    val InputHeight = 44.dp
    val BottomActionHeight = 44.dp
}

private enum class InventoryOperationMode(
    @StringRes val titleRes: Int,
    @StringRes val sourceLocationLabelRes: Int,
    @StringRes val submitSuccessRes: Int,
    val showAdjustType: Boolean,
    val requiresTargetLocation: Boolean,
) {
    Adjust(
        titleRes = R.string.inventory_adjust_title,
        sourceLocationLabelRes = R.string.inventory_field_location,
        submitSuccessRes = R.string.inventory_adjust_success,
        showAdjustType = true,
        requiresTargetLocation = false
    ),
    Transfer(
        titleRes = R.string.inventory_transfer_title,
        sourceLocationLabelRes = R.string.inventory_field_old_location,
        submitSuccessRes = R.string.inventory_transfer_success,
        showAdjustType = false,
        requiresTargetLocation = true
    )
}

enum class InventoryAdjustType(
    @StringRes val labelRes: Int,
    val sign: Int,
) {
    Increase(R.string.inventory_adjust_type_increase, 1),
    Decrease(R.string.inventory_adjust_type_decrease, -1),
}

enum class InventoryAdjustReason(
    val code: String,
    @StringRes val labelRes: Int,
) {
    Surplus("SURPLUS", R.string.inventory_reason_surplus),
    Shortage("SHORTAGE", R.string.inventory_reason_shortage),
    Damage("DAMAGE", R.string.inventory_reason_damage),
    Other("OTHER", R.string.inventory_reason_other),
}

@Composable
fun InventoryAdjustScreen(
    uiState: InventoryUiState,
    onSourceLocationChange: (String) -> Unit,
    onSubmitSourceLocation: (String) -> Unit,
    onSkuOrBarcodeChange: (String) -> Unit,
    onSubmitSkuOrBarcode: (String) -> Unit,
    onTargetLocationChange: (String) -> Unit,
    onInventoryCandidateSelected: (String) -> Unit,
    onAsnSelectorDismiss: () -> Unit,
    onAdjustTypeChange: (InventoryAdjustType) -> Unit,
    onAdjustQuantityChange: (String) -> Unit,
    onAdjustReasonChange: (InventoryAdjustReason) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    InventoryOperationScreen(
        mode = InventoryOperationMode.Adjust,
        uiState = uiState,
        onSourceLocationChange = onSourceLocationChange,
        onSubmitSourceLocation = onSubmitSourceLocation,
        onSkuOrBarcodeChange = onSkuOrBarcodeChange,
        onSubmitSkuOrBarcode = onSubmitSkuOrBarcode,
        onTargetLocationChange = onTargetLocationChange,
        onInventoryCandidateSelected = onInventoryCandidateSelected,
        onAsnSelectorDismiss = onAsnSelectorDismiss,
        onAdjustTypeChange = onAdjustTypeChange,
        onAdjustQuantityChange = onAdjustQuantityChange,
        onAdjustReasonChange = onAdjustReasonChange,
        onSubmit = onSubmit,
        onBack = onBack,
        modifier = modifier
    )
}

@Composable
fun InventoryTransferScreen(
    uiState: InventoryUiState,
    onSourceLocationChange: (String) -> Unit,
    onSubmitSourceLocation: (String) -> Unit,
    onSkuOrBarcodeChange: (String) -> Unit,
    onSubmitSkuOrBarcode: (String) -> Unit,
    onTargetLocationChange: (String) -> Unit,
    onInventoryCandidateSelected: (String) -> Unit,
    onAsnSelectorDismiss: () -> Unit,
    onAdjustTypeChange: (InventoryAdjustType) -> Unit,
    onAdjustQuantityChange: (String) -> Unit,
    onAdjustReasonChange: (InventoryAdjustReason) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    InventoryOperationScreen(
        mode = InventoryOperationMode.Transfer,
        uiState = uiState,
        onSourceLocationChange = onSourceLocationChange,
        onSubmitSourceLocation = onSubmitSourceLocation,
        onSkuOrBarcodeChange = onSkuOrBarcodeChange,
        onSubmitSkuOrBarcode = onSubmitSkuOrBarcode,
        onTargetLocationChange = onTargetLocationChange,
        onInventoryCandidateSelected = onInventoryCandidateSelected,
        onAsnSelectorDismiss = onAsnSelectorDismiss,
        onAdjustTypeChange = onAdjustTypeChange,
        onAdjustQuantityChange = onAdjustQuantityChange,
        onAdjustReasonChange = onAdjustReasonChange,
        onSubmit = onSubmit,
        onBack = onBack,
        modifier = modifier
    )
}

@Composable
private fun InventoryOperationScreen(
    mode: InventoryOperationMode,
    uiState: InventoryUiState,
    onSourceLocationChange: (String) -> Unit,
    onSubmitSourceLocation: (String) -> Unit,
    onSkuOrBarcodeChange: (String) -> Unit,
    onSubmitSkuOrBarcode: (String) -> Unit,
    onTargetLocationChange: (String) -> Unit,
    onInventoryCandidateSelected: (String) -> Unit,
    onAsnSelectorDismiss: () -> Unit,
    onAdjustTypeChange: (InventoryAdjustType) -> Unit,
    onAdjustQuantityChange: (String) -> Unit,
    onAdjustReasonChange: (InventoryAdjustReason) -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val sourceLocationFocusRequester = remember { FocusRequester() }
    val skuFocusRequester = remember { FocusRequester() }
    val targetLocationFocusRequester = remember { FocusRequester() }
    val adjustQuantityFocusRequester = remember { FocusRequester() }
    val valuePlaceholder = stringResource(R.string.inventory_value_placeholder)
    val feedbackSuccessTitle = stringResource(R.string.inventory_feedback_success)
    val feedbackErrorTitle = stringResource(R.string.inventory_feedback_error)
    val beforeQuantityValue = uiState.beforeQuantity.trim().toBigDecimalOrNull()
    val adjustQuantityValue = uiState.adjustQuantity.trim().toBigDecimalOrNull()
    val calculatedAfterQuantity = if (mode.showAdjustType && beforeQuantityValue != null && adjustQuantityValue != null) {
        val sign = uiState.adjustType.sign.toBigDecimal()
        (beforeQuantityValue + adjustQuantityValue * sign).stripTrailingZeros().toPlainString()
    } else {
        valuePlaceholder
    }

    LaunchedEffect(mode) {
        sourceLocationFocusRequester.requestFocusSafely()
    }

    LaunchedEffect(mode, uiState.beforeQuantity, uiState.isLoading) {
        if (!uiState.isLoading && uiState.beforeQuantity.isNotBlank()) {
            if (mode.requiresTargetLocation) {
                targetLocationFocusRequester.requestFocusSafely()
            } else {
                adjustQuantityFocusRequester.requestFocusSafely()
            }
        }
    }

    LaunchedEffect(uiState.submitAction) {
        if (uiState.submitAction == PdaActionState.Success) {
            sourceLocationFocusRequester.requestFocusSafely()
        }
    }

    Scaffold(
        topBar = {
            PdaTopBar(
                title = stringResource(mode.titleRes),
                onBack = onBack
            )
        },
        bottomBar = {
            PdaBottomActionBar {
                PdaBottomBarPrimaryButton(
                    text = stringResource(R.string.inventory_action_submit),
                    onClick = onSubmit,
                    enabled = !uiState.isLoading && !uiState.submitAction.isRunning,
                    isLoading = uiState.submitAction.isRunning,
                    height = InventoryUiCompact.BottomActionHeight
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(
                    horizontal = InventoryUiCompact.ScreenHorizontalPadding,
                    vertical = InventoryUiCompact.ScreenVerticalPadding
                )
        ) {
            InventoryFormContent(
                mode = mode,
                skuOrBarcode = uiState.skuOrBarcode,
                sourceLocation = uiState.sourceLocation,
                targetLocation = uiState.targetLocation,
                matches = uiState.matches,
                hasMultipleCandidates = uiState.hasMultipleCandidates,
                selectedCandidateId = uiState.selectedCandidateId,
                showAsnSelectorDialog = uiState.showAsnSelectorDialog,
                beforeQuantity = uiState.beforeQuantity,
                quality = uiState.quality,
                adjustType = uiState.adjustType,
                adjustQuantity = uiState.adjustQuantity,
                adjustReason = uiState.adjustReason,
                calculatedAfterQuantity = calculatedAfterQuantity,
                expiryDate = uiState.expiryDate,
                batchNo = uiState.batchNo,
                feedbackMessage = uiState.feedbackMessage,
                feedbackTone = uiState.feedbackTone,
                feedbackErrorTitle = feedbackErrorTitle,
                feedbackSuccessTitle = feedbackSuccessTitle,
                valuePlaceholder = valuePlaceholder,
                sourceLocationFocusRequester = sourceLocationFocusRequester,
                skuFocusRequester = skuFocusRequester,
                targetLocationFocusRequester = targetLocationFocusRequester,
                adjustQuantityFocusRequester = adjustQuantityFocusRequester,
                onSkuOrBarcodeChange = onSkuOrBarcodeChange,
                onSubmitSkuOrBarcode = onSubmitSkuOrBarcode,
                onSourceLocationChange = onSourceLocationChange,
                onSubmitSourceLocation = onSubmitSourceLocation,
                onTargetLocationChange = onTargetLocationChange,
                onInventoryCandidateSelected = onInventoryCandidateSelected,
                onAsnSelectorDismiss = onAsnSelectorDismiss,
                onAdjustTypeChange = onAdjustTypeChange,
                onAdjustQuantityChange = onAdjustQuantityChange,
                onAdjustReasonChange = onAdjustReasonChange,
                modifier = Modifier.fillMaxSize()
            )
        }
    }
}

@Composable
private fun InventoryFormContent(
    mode: InventoryOperationMode,
    skuOrBarcode: String,
    sourceLocation: String,
    targetLocation: String,
    matches: List<InventoryCandidate>,
    hasMultipleCandidates: Boolean,
    selectedCandidateId: String,
    showAsnSelectorDialog: Boolean,
    beforeQuantity: String,
    quality: String,
    adjustType: InventoryAdjustType,
    adjustQuantity: String,
    adjustReason: InventoryAdjustReason,
    calculatedAfterQuantity: String,
    expiryDate: String,
    batchNo: String,
    feedbackMessage: String?,
    feedbackTone: PdaFeedbackTone,
    feedbackErrorTitle: String,
    feedbackSuccessTitle: String,
    valuePlaceholder: String,
    sourceLocationFocusRequester: FocusRequester,
    skuFocusRequester: FocusRequester,
    targetLocationFocusRequester: FocusRequester,
    adjustQuantityFocusRequester: FocusRequester,
    onSkuOrBarcodeChange: (String) -> Unit,
    onSubmitSkuOrBarcode: (String) -> Unit,
    onSourceLocationChange: (String) -> Unit,
    onSubmitSourceLocation: (String) -> Unit,
    onTargetLocationChange: (String) -> Unit,
    onInventoryCandidateSelected: (String) -> Unit,
    onAsnSelectorDismiss: () -> Unit,
    onAdjustTypeChange: (InventoryAdjustType) -> Unit,
    onAdjustQuantityChange: (String) -> Unit,
    onAdjustReasonChange: (InventoryAdjustReason) -> Unit,
    modifier: Modifier = Modifier,
) {
    val coroutineScope = rememberCoroutineScope()
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.spacedBy(InventoryUiCompact.SectionSpacing)
    ) {
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surface
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(InventoryUiCompact.CardPadding),
                verticalArrangement = Arrangement.spacedBy(InventoryUiCompact.FieldSpacing)
            ) {
                PdaTextField(
                    value = sourceLocation,
                    onValueChange = onSourceLocationChange,
                    focusRequester = sourceLocationFocusRequester,
                    label = stringResource(mode.sourceLocationLabelRes),
                    submitOnLineBreak = true,
                    onLineBreakSubmit = {
                        onSubmitSourceLocation(it)
                        coroutineScope.launch {
                            skuFocusRequester.requestFocusSafely()
                        }
                    },
                    onImeAction = {
                        onSubmitSourceLocation(sourceLocation)
                        coroutineScope.launch {
                            skuFocusRequester.requestFocusSafely()
                        }
                    },
                    imeAction = ImeAction.Next,
                    height = InventoryUiCompact.InputHeight
                )

                PdaTextField(
                    value = skuOrBarcode,
                    onValueChange = onSkuOrBarcodeChange,
                    focusRequester = skuFocusRequester,
                    label = stringResource(R.string.inventory_field_sku_or_barcode),
                    submitOnLineBreak = true,
                    onLineBreakSubmit = onSubmitSkuOrBarcode,
                    onImeAction = { onSubmitSkuOrBarcode(skuOrBarcode) },
                    imeAction = ImeAction.Next,
                    height = InventoryUiCompact.InputHeight
                )

                InventoryCandidateSelector(
                    candidates = matches,
                    selectedCandidateId = selectedCandidateId,
                    quality = quality,
                    expiryDate = expiryDate,
                    batchNo = batchNo,
                    valuePlaceholder = valuePlaceholder,
                    enabled = hasMultipleCandidates,
                    expanded = showAsnSelectorDialog,
                    onExpandedChange = { expanded ->
                        if (!expanded) {
                            onAsnSelectorDismiss()
                        }
                    },
                    onSelected = onInventoryCandidateSelected
                )

                if (mode.showAdjustType) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(InventoryUiCompact.FieldSpacing)
                    ) {
                        InventoryTextDisplay(
                            label = stringResource(R.string.inventory_field_before_quantity),
                            value = beforeQuantity.ifBlank { valuePlaceholder },
                            modifier = Modifier.weight(1f)
                        )
                        InventoryTextDisplay(
                            label = stringResource(R.string.inventory_field_after_quantity),
                            value = calculatedAfterQuantity,
                            modifier = Modifier.weight(1f)
                        )
                    }
                } else {
                    PdaTextField(
                        value = targetLocation,
                        onValueChange = onTargetLocationChange,
                        focusRequester = targetLocationFocusRequester,
                        label = stringResource(R.string.inventory_field_new_location),
                        submitOnLineBreak = true,
                        onLineBreakSubmit = {
                            onTargetLocationChange(it)
                            coroutineScope.launch {
                                adjustQuantityFocusRequester.requestFocusSafely()
                            }
                        },
                        onImeAction = {
                            onTargetLocationChange(targetLocation)
                            coroutineScope.launch {
                                adjustQuantityFocusRequester.requestFocusSafely()
                            }
                        },
                        imeAction = ImeAction.Next,
                        height = InventoryUiCompact.InputHeight
                    )
                }

                if (mode.showAdjustType) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(InventoryUiCompact.FieldSpacing),
                        verticalAlignment = Alignment.Top
                    ) {
                        InventoryAdjustTypeSelector(
                            selectedType = adjustType,
                            onTypeSelected = onAdjustTypeChange,
                            modifier = Modifier.weight(1f)
                        )
                        PdaTextField(
                            value = adjustQuantity,
                            onValueChange = onAdjustQuantityChange,
                            focusRequester = adjustQuantityFocusRequester,
                            label = stringResource(R.string.inventory_field_adjust_quantity),
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Next,
                            height = InventoryUiCompact.InputHeight,
                            modifier = Modifier.weight(1f)
                        )
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(InventoryUiCompact.FieldSpacing),
                        verticalAlignment = Alignment.Top
                    ) {
                        InventoryTextDisplay(
                            label = stringResource(R.string.inventory_field_before_quantity),
                            value = beforeQuantity.ifBlank { valuePlaceholder },
                            modifier = Modifier.weight(1f)
                        )
                        PdaTextField(
                            value = adjustQuantity,
                            onValueChange = onAdjustQuantityChange,
                            focusRequester = adjustQuantityFocusRequester,
                            label = stringResource(R.string.inventory_field_adjust_quantity),
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Next,
                            height = InventoryUiCompact.InputHeight,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                InventoryAdjustReasonField(
                    selectedReason = adjustReason,
                    onReasonSelected = onAdjustReasonChange
                )
            }
        }

        feedbackMessage?.let { message ->
            PdaFeedbackBanner(
                message = message,
                title = if (feedbackTone == PdaFeedbackTone.Error) feedbackErrorTitle else feedbackSuccessTitle,
                tone = feedbackTone
            )
        }
    }
}

@Composable
private fun InventoryCandidateSelector(
    candidates: List<InventoryCandidate>,
    selectedCandidateId: String,
    quality: String,
    expiryDate: String,
    batchNo: String,
    valuePlaceholder: String,
    enabled: Boolean,
    expanded: Boolean,
    onExpandedChange: (Boolean) -> Unit,
    onSelected: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val noAsnLabel = context.getString(R.string.inventory_asn_empty)
    var pickerExpanded by remember(candidates, enabled) { mutableStateOf(false) }

    LaunchedEffect(expanded, candidates, enabled) {
        if (expanded && enabled && candidates.isNotEmpty()) {
            pickerExpanded = true
        }
    }

    val selectedCandidate = when {
        selectedCandidateId.isBlank() && enabled -> null
        selectedCandidateId.isBlank() -> candidates.firstOrNull()
        else -> candidates.firstOrNull { it.inventoryId == selectedCandidateId }
    }
    val options = candidates.map { candidate ->
        PdaPickerOption(
            key = candidate.inventoryId,
            title = candidate.asnNumber.ifBlank { noAsnLabel },
            subtitle = buildAsnMetaText(
                context = context,
                quantity = candidate.quantity.toString(),
                quality = bucketTypeDisplayLabel(context, candidate.bucketType),
                expiryDate = candidate.expiryDate.orEmpty(),
                batchNo = candidate.batchNumber,
                valuePlaceholder = valuePlaceholder
            )
        )
    }.sortedWith(
        compareByDescending<PdaPickerOption> { it.key == selectedCandidateId }
            .thenBy { it.title }
    )
    val selectedOption = if (selectedCandidate == null && enabled) {
        null
    } else {
        options.firstOrNull { it.key == selectedCandidateId } ?: options.firstOrNull()
    }

    PdaBottomSheetPicker(
        label = stringResource(R.string.inventory_field_asn_candidate),
        selectedTitle = selectedOption?.title ?: valuePlaceholder,
        selectedSubtitle = selectedCandidate?.let {
            buildAsnMetaText(
                context = context,
                quantity = it.quantity.toString(),
                quality = quality,
                expiryDate = expiryDate,
                batchNo = batchNo,
                valuePlaceholder = valuePlaceholder
            )
        },
        options = options,
        selectedKey = selectedOption?.key,
        onSelect = onSelected,
        enabled = enabled,
        expanded = pickerExpanded,
        onExpandedChange = { isExpanded ->
            pickerExpanded = isExpanded
            onExpandedChange(isExpanded)
        },
        modifier = modifier
    )
}

@Composable
private fun InventoryAdjustTypeSelector(
    selectedType: InventoryAdjustType,
    onTypeSelected: (InventoryAdjustType) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = stringResource(R.string.inventory_field_adjust_type),
            style = MaterialTheme.typography.labelSmall
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(InventoryUiCompact.FieldSpacing)
        ) {
            InventoryAdjustType.values().forEach { type ->
                PdaSelectionButton(
                    text = stringResource(type.labelRes),
                    selected = selectedType == type,
                    onClick = { onTypeSelected(type) },
                    modifier = Modifier.weight(1f),
                    selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.16f),
                    selectedContentColor = MaterialTheme.colorScheme.primary,
                    height = InventoryUiCompact.InputHeight
                )
            }
        }
    }
}

@Composable
private fun InventoryAdjustReasonField(
    selectedReason: InventoryAdjustReason,
    onReasonSelected: (InventoryAdjustReason) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val options = buildList {
        InventoryAdjustReason.values().forEach { reason ->
            add(
                PdaPickerOption(
                    key = reason.code,
                    title = context.getString(reason.labelRes)
                )
            )
        }
    }

    PdaBottomSheetPicker(
        label = stringResource(R.string.inventory_field_adjust_reason),
        selectedTitle = stringResource(selectedReason.labelRes),
        options = options,
        selectedKey = selectedReason.code,
        onSelect = { selectedKey ->
            InventoryAdjustReason.values()
                .firstOrNull { it.code == selectedKey }
                ?.let(onReasonSelected)
        },
        modifier = modifier
    )
}

private fun buildAsnMetaText(
    context: android.content.Context,
    quantity: String,
    quality: String,
    expiryDate: String,
    batchNo: String,
    valuePlaceholder: String,
): String {
    val parts = mutableListOf<String>()
    if (quantity.isNotBlank()) {
        parts += context.getString(R.string.inventory_asn_quantity_format, quantity)
    }
    if (quality.isNotBlank()) {
        parts += context.getString(R.string.inventory_asn_quality_format, quality)
    }
    parts += context.getString(
        R.string.inventory_asn_expiry_format,
        expiryDate.ifBlank { valuePlaceholder }
    )
    parts += context.getString(
        R.string.inventory_asn_batch_format,
        batchNo.ifBlank { valuePlaceholder }
    )
    return parts.joinToString(" | ")
}

private fun bucketTypeDisplayLabel(
    context: android.content.Context,
    bucketType: String,
): String {
    return when (bucketType.uppercase()) {
        "AVAILABLE" -> context.getString(R.string.inventory_quality_available)
        "DEFECTIVE" -> context.getString(R.string.inventory_quality_defective)
        "FROZEN" -> context.getString(R.string.inventory_quality_frozen)
        "QC_HOLD" -> context.getString(R.string.inventory_quality_qc_hold)
        "COUNT_HOLD" -> context.getString(R.string.inventory_quality_count_hold)
        else -> bucketType
    }
}

@Composable
private fun InventoryTextDisplay(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = InventoryUiCompact.InputHeight),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
