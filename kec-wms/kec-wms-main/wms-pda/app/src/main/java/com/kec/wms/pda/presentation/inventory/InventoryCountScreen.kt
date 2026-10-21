package com.kec.wms.pda.presentation.inventory

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.InventoryCountBatchSummary
import com.kec.wms.pda.data.model.InventoryCountDetail
import com.kec.wms.pda.presentation.common.PdaActionPhase
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely
import kotlinx.coroutines.android.awaitFrame

private object InventoryCountUiCompact {
    val ScreenHorizontalPadding = 8.dp
    val ScreenVerticalPadding = 6.dp
    val SectionSpacing = 8.dp
    val CardPadding = 10.dp
    val FieldHeight = 44.dp
    val ButtonHeight = 44.dp
}

@Composable
fun InventoryCountScreen(
    uiState: InventoryCountUiState,
    onBatchClick: (InventoryCountBatchSummary) -> Unit,
    onLocationChange: (String) -> Unit,
    onSkuChange: (String) -> Unit,
    onQuantityChange: (String) -> Unit,
    onValidateLocation: (String) -> Boolean,
    onValidateSku: (String) -> Boolean,
    onSubmit: () -> Unit,
    onClearFeedback: () -> Unit,
    onBack: () -> Unit,
) {
    val locationFocus = remember { FocusRequester() }
    val skuFocus = remember { FocusRequester() }
    val quantityFocus = remember { FocusRequester() }

    InventoryCountFeedbackToast(uiState = uiState, onClearFeedback = onClearFeedback)

    LaunchedEffect(uiState.phase, uiState.selectedBatch?.batchId, uiState.isLoadingDetail) {
        if (uiState.phase == InventoryCountPhase.Work && !uiState.isLoadingDetail) {
            awaitFrame()
            locationFocus.requestFocusSafely()
        }
    }

    LaunchedEffect(
        uiState.phase,
        uiState.submitAction.phase,
        uiState.targetLocationCode,
        uiState.locationInput,
        uiState.selectedDetailId
    ) {
        if (
            uiState.phase == InventoryCountPhase.Work &&
            uiState.submitAction.phase == PdaActionPhase.Success &&
            uiState.locationInput.isBlank() &&
            uiState.selectedDetailId.isBlank()
        ) {
            awaitFrame()
            locationFocus.requestFocusSafely()
        }
    }

    LaunchedEffect(
        uiState.phase,
        uiState.locationInput,
        uiState.locationConfirmed,
        uiState.selectedDetailId,
        uiState.submitAction.phase
    ) {
        if (
            uiState.phase == InventoryCountPhase.Work &&
            uiState.isLocationConfirmed &&
            uiState.selectedDetailId.isBlank()
        ) {
            awaitFrame()
            skuFocus.requestFocusSafely()
        }
    }

    LaunchedEffect(uiState.selectedDetailId) {
        if (uiState.selectedDetailId.isNotBlank()) {
            awaitFrame()
            quantityFocus.requestFocusSafely()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        PdaTopBar(
            title = when (uiState.phase) {
                InventoryCountPhase.List -> stringResource(R.string.inventory_count_title)
                InventoryCountPhase.Work -> stringResource(R.string.inventory_count_work_title)
            },
            onBack = onBack
        )

        when (uiState.phase) {
            InventoryCountPhase.List -> InventoryCountListContent(
                uiState = uiState,
                onBatchClick = onBatchClick
            )
            InventoryCountPhase.Work -> InventoryCountWorkContent(
                uiState = uiState,
                locationFocus = locationFocus,
                skuFocus = skuFocus,
                quantityFocus = quantityFocus,
                onLocationChange = onLocationChange,
                onSkuChange = onSkuChange,
                onQuantityChange = onQuantityChange,
                onValidateLocation = onValidateLocation,
                onValidateSku = onValidateSku,
                onSubmit = onSubmit,
                onClearFeedback = onClearFeedback
            )
        }
    }
}

@Composable
private fun InventoryCountListContent(
    uiState: InventoryCountUiState,
    onBatchClick: (InventoryCountBatchSummary) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(
                horizontal = InventoryCountUiCompact.ScreenHorizontalPadding,
                vertical = InventoryCountUiCompact.ScreenVerticalPadding
            ),
        verticalArrangement = Arrangement.spacedBy(InventoryCountUiCompact.SectionSpacing)
    ) {
        if (uiState.isLoadingList) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return
        }

        if (uiState.batches.isEmpty()) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = stringResource(R.string.inventory_count_list_empty),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            return
        }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(InventoryCountUiCompact.SectionSpacing)) {
            items(uiState.batches, key = { it.batchId }) { batch ->
                InventoryCountBatchCard(batch = batch, onClick = { onBatchClick(batch) })
            }
        }
    }
}

@Composable
private fun InventoryCountWorkContent(
    uiState: InventoryCountUiState,
    locationFocus: FocusRequester,
    skuFocus: FocusRequester,
    quantityFocus: FocusRequester,
    onLocationChange: (String) -> Unit,
    onSkuChange: (String) -> Unit,
    onQuantityChange: (String) -> Unit,
    onValidateLocation: (String) -> Boolean,
    onValidateSku: (String) -> Boolean,
    onSubmit: () -> Unit,
    onClearFeedback: () -> Unit,
) {
    val selectedDetail = uiState.selectedDetail

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(
                horizontal = InventoryCountUiCompact.ScreenHorizontalPadding,
                vertical = InventoryCountUiCompact.ScreenVerticalPadding
            ),
        verticalArrangement = Arrangement.spacedBy(InventoryCountUiCompact.SectionSpacing)
    ) {
        if (uiState.isLoadingDetail) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return
        }

        Text(
            text = stringResource(
                R.string.inventory_count_current_location_format,
                uiState.currentCountingLocation.ifBlank { valueOrPlaceholder(null) }
            ),
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.primary,
            fontWeight = FontWeight.Bold
        )

        PdaTextField(
            value = uiState.locationInput,
            onValueChange = {
                onLocationChange(it)
                onClearFeedback()
            },
            focusRequester = locationFocus,
            label = stringResource(R.string.inventory_count_field_location),
            submitOnLineBreak = true,
            onLineBreakSubmit = { scanned ->
                onLocationChange(scanned)
                onValidateLocation(scanned)
            },
            onImeAction = { onValidateLocation(uiState.locationInput) },
            selectAllOnFocus = true,
            selectAllAfterSubmit = true,
            imeAction = ImeAction.Next,
            height = InventoryCountUiCompact.FieldHeight
        )

        PdaTextField(
            value = uiState.skuInput,
            onValueChange = {
                onSkuChange(it)
                onClearFeedback()
            },
            focusRequester = skuFocus,
            label = stringResource(R.string.inventory_count_field_sku_or_barcode),
            enabled = uiState.isLocationConfirmed,
            submitOnLineBreak = true,
            onLineBreakSubmit = { scanned ->
                onSkuChange(scanned)
                onValidateSku(scanned)
            },
            onImeAction = { onValidateSku(uiState.skuInput) },
            selectAllOnFocus = true,
            selectAllAfterSubmit = true,
            imeAction = ImeAction.Next,
            height = InventoryCountUiCompact.FieldHeight
        )

        val showBookQuantity = uiState.selectedBatch?.pdaMode == "OPEN"
        uiState.selectedGroupedQuantity?.let { grouped ->
            Text(
                text = if (showBookQuantity) {
                    stringResource(
                        R.string.inventory_count_grouped_quantity_format,
                        grouped.quantity,
                        valueOrPlaceholder(grouped.batchNumber),
                        valueOrPlaceholder(grouped.expiryDate)
                    )
                } else {
                    stringResource(
                        R.string.inventory_count_grouped_identity_format,
                        valueOrPlaceholder(grouped.batchNumber),
                        valueOrPlaceholder(grouped.expiryDate)
                    )
                },
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
        }

        PdaTextField(
            value = uiState.quantityInput,
            onValueChange = {
                onQuantityChange(it)
                onClearFeedback()
            },
            focusRequester = quantityFocus,
            label = stringResource(R.string.inventory_count_field_counted_quantity),
            enabled = selectedDetail != null,
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done,
            onImeAction = onSubmit,
            height = InventoryCountUiCompact.FieldHeight
        )

        PdaButton(
            text = stringResource(R.string.inventory_count_action_submit_line),
            onClick = onSubmit,
            modifier = Modifier.fillMaxWidth(),
            enabled = selectedDetail != null && !uiState.submitAction.isRunning,
            isLoading = uiState.submitAction.isRunning,
            height = InventoryCountUiCompact.ButtonHeight,
            fontSize = MaterialTheme.typography.bodyLarge.fontSize
        )

        InventoryCountPendingList(uiState = uiState)
    }
}

@Composable
private fun InventoryCountBatchCard(
    batch: InventoryCountBatchSummary,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(InventoryCountUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = batch.batchNumber,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = stringResource(R.string.inventory_count_order_number_format, batch.orderNumber),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = stringResource(
                    R.string.inventory_count_progress_format,
                    batch.countedDetailCount,
                    batch.totalDetailCount,
                    batch.progressPercent
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.primary
            )
            Text(
                text = stringResource(R.string.inventory_count_order_scope_format, batch.locationCount, batch.skuCount),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = stringResource(
                    R.string.inventory_count_order_type_status_format,
                    orderTypeText(batch.orderType),
                    statusText(batch.status)
                ),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = stringResource(R.string.inventory_count_order_mode_format, countModeText(batch.pdaMode)),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
@Composable
private fun InventoryCountPendingList(uiState: InventoryCountUiState) {
    val batch = uiState.selectedBatch ?: return
    val locationCode = uiState.currentCountingLocation
    val pendingDetails = uiState.details
        .filter { detail ->
            isInventoryCountDetailPending(batch.batchType, detail.status) &&
                (locationCode.isBlank() || detail.locationCode.equals(locationCode, ignoreCase = true))
        }
        .take(5)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(InventoryCountUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = stringResource(R.string.inventory_count_pending_title),
                fontWeight = FontWeight.Bold
            )
            if (pendingDetails.isEmpty()) {
                Text(
                    text = stringResource(R.string.inventory_count_pending_empty),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            } else {
                pendingDetails.forEach { detail ->
                    Text(
                        text = stringResource(
                            R.string.inventory_count_pending_item_format,
                            detail.skuCode,
                            valueOrPlaceholder(detail.batchNumber),
                            valueOrPlaceholder(detail.expiryDate)
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }
    }
}

@Composable
private fun InventoryCountFeedbackToast(
    uiState: InventoryCountUiState,
    onClearFeedback: () -> Unit,
) {
    val context = LocalContext.current
    LaunchedEffect(uiState.feedbackMessage) {
        val message = uiState.feedbackMessage?.takeIf { it.isNotBlank() } ?: return@LaunchedEffect
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        onClearFeedback()
    }
}

@Composable
private fun orderTypeText(value: String): String {
    return when (value) {
        "FULL" -> stringResource(R.string.inventory_count_order_type_full)
        "LOCATION" -> stringResource(R.string.inventory_count_order_type_location)
        "SKU" -> stringResource(R.string.inventory_count_order_type_sku)
        "CYCLE" -> stringResource(R.string.inventory_count_order_type_cycle)
        else -> value
    }
}

@Composable
private fun countModeText(value: String): String {
    return when (value) {
        "OPEN" -> stringResource(R.string.inventory_count_mode_open)
        else -> stringResource(R.string.inventory_count_mode_blind)
    }
}

@Composable
private fun statusText(value: String): String {
    return when (value) {
        "READY" -> stringResource(R.string.inventory_count_status_ready)
        "IN_PROGRESS" -> stringResource(R.string.inventory_count_status_in_progress)
        "PENDING_ADJUST" -> stringResource(R.string.inventory_count_status_pending_adjust)
        "RECOUNTING" -> stringResource(R.string.inventory_count_status_recounting)
        "COMPLETED" -> stringResource(R.string.inventory_count_status_completed)
        else -> value
    }
}

@Composable
private fun valueOrPlaceholder(value: String?): String {
    return value?.takeIf { it.isNotBlank() } ?: stringResource(R.string.inventory_value_placeholder)
}
