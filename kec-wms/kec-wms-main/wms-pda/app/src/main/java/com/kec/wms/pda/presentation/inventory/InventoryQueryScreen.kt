package com.kec.wms.pda.presentation.inventory

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.InventoryQueryItem
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely

private object InventoryQueryUiCompact {
    val ScreenHorizontalPadding = 8.dp
    val ScreenVerticalPadding = 6.dp
    val SectionSpacing = 8.dp
    val FieldSpacing = 6.dp
    val CardPadding = 10.dp
    val InputHeight = 44.dp
}

private enum class InventoryQueryActiveInput {
    Sku,
    Location,
}

@Composable
fun InventoryQueryScreen(
    uiState: InventoryQueryUiState,
    onSkuOrBarcodeChange: (String) -> Unit,
    onLocationCodeChange: (String) -> Unit,
    onSearch: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val skuFocusRequester = remember { FocusRequester() }
    val locationFocusRequester = remember { FocusRequester() }
    var skuSelectAllRequest by remember { mutableIntStateOf(0) }
    var locationSelectAllRequest by remember { mutableIntStateOf(0) }
    var activeInput by remember { mutableStateOf(InventoryQueryActiveInput.Sku) }
    val feedbackErrorTitle = stringResource(R.string.inventory_feedback_error)

    LaunchedEffect(Unit) {
        skuFocusRequester.requestFocusSafely()
    }

    LaunchedEffect(skuSelectAllRequest) {
        if (skuSelectAllRequest > 0) {
            skuFocusRequester.requestFocusSafely()
        }
    }

    LaunchedEffect(locationSelectAllRequest) {
        if (locationSelectAllRequest > 0) {
            locationFocusRequester.requestFocusSafely()
        }
    }

    LaunchedEffect(uiState.isLoading, uiState.feedbackMessage, activeInput) {
        if (!uiState.isLoading && !uiState.feedbackMessage.isNullOrBlank()) {
            when (activeInput) {
                InventoryQueryActiveInput.Sku -> {
                    if (uiState.skuOrBarcode.isNotBlank()) {
                        skuSelectAllRequest++
                    }
                }
                InventoryQueryActiveInput.Location -> {
                    if (uiState.locationCode.isNotBlank()) {
                        locationSelectAllRequest++
                    }
                }
            }
        }
    }

    Scaffold(
        topBar = {
            PdaTopBar(
                title = stringResource(R.string.menu_inventory_query),
                onBack = onBack
            )
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(
                    horizontal = InventoryQueryUiCompact.ScreenHorizontalPadding,
                    vertical = InventoryQueryUiCompact.ScreenVerticalPadding
                ),
            verticalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.SectionSpacing)
        ) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(InventoryQueryUiCompact.CardPadding),
                    verticalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.FieldSpacing)
                ) {
                    PdaTextField(
                        value = uiState.skuOrBarcode,
                        onValueChange = onSkuOrBarcodeChange,
                        focusRequester = skuFocusRequester,
                        label = stringResource(R.string.inventory_field_sku_or_barcode),
                        submitOnLineBreak = true,
                        onLineBreakSubmit = {
                            onSkuOrBarcodeChange(it)
                            skuSelectAllRequest++
                            onSearch()
                        },
                        onImeAction = {
                            skuSelectAllRequest++
                            onSearch()
                        },
                        selectAllOnFocus = true,
                        selectAllAfterSubmit = true,
                        selectAllRequestKey = skuSelectAllRequest,
                        onFocusChanged = { focused ->
                            if (focused) {
                                activeInput = InventoryQueryActiveInput.Sku
                            }
                        },
                        imeAction = ImeAction.Next,
                        height = InventoryQueryUiCompact.InputHeight
                    )

                    PdaTextField(
                        value = uiState.locationCode,
                        onValueChange = onLocationCodeChange,
                        focusRequester = locationFocusRequester,
                        label = stringResource(R.string.inventory_field_location),
                        submitOnLineBreak = true,
                        onLineBreakSubmit = {
                            onLocationCodeChange(it)
                            locationSelectAllRequest++
                            onSearch()
                        },
                        onImeAction = {
                            locationSelectAllRequest++
                            onSearch()
                        },
                        selectAllOnFocus = true,
                        selectAllAfterSubmit = true,
                        selectAllRequestKey = locationSelectAllRequest,
                        onFocusChanged = { focused ->
                            if (focused) {
                                activeInput = InventoryQueryActiveInput.Location
                            }
                        },
                        imeAction = ImeAction.Done,
                        height = InventoryQueryUiCompact.InputHeight
                    )
                }
            }

            uiState.feedbackMessage?.let { message ->
                PdaFeedbackBanner(
                    message = message,
                    title = feedbackErrorTitle,
                    tone = uiState.feedbackTone
                )
            }

            if (uiState.results.isEmpty()) {
                InventoryQueryEmptyState(
                    modifier = Modifier.fillMaxWidth()
                )
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.SectionSpacing)
                ) {
                    items(
                        items = uiState.results,
                        key = { item ->
                            listOf(
                                item.client?.id.orEmpty(),
                                item.locationCode,
                                item.skuCode,
                                item.asnNumber,
                                item.expiryDate.orEmpty(),
                                item.batchNumber
                            ).joinToString("|")
                        }
                    ) { item ->
                        InventoryQueryResultCard(item = item)
                    }
                }
            }
        }
    }
}

@Composable
private fun InventoryQueryEmptyState(
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = stringResource(R.string.inventory_query_empty_hint),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun InventoryQueryResultCard(
    item: InventoryQueryItem,
    modifier: Modifier = Modifier,
) {
    val placeholder = stringResource(R.string.inventory_value_placeholder)
    val locationValue = item.locationCode.ifBlank { placeholder }
    val skuValue = item.skuCode.ifBlank { placeholder }
    val clientValue = item.client?.clientName.orEmpty().ifBlank { placeholder }
    val asnValue = item.asnNumber.ifBlank { stringResource(R.string.inventory_asn_empty) }
    val expiryValue = item.expiryDate.orEmpty().ifBlank { placeholder }
    val batchValue = item.batchNumber.ifBlank { placeholder }
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(InventoryQueryUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.FieldSpacing)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                        shape = MaterialTheme.shapes.medium
                    )
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.FieldSpacing)
                ) {
                    InventoryPrimaryInfo(
                        label = stringResource(R.string.inventory_field_location),
                        value = locationValue,
                        modifier = Modifier.weight(1f),
                        emphasize = true
                    )
                    InventoryPrimaryInfo(
                        label = stringResource(R.string.inventory_query_field_sku),
                        value = skuValue,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.FieldSpacing)
            ) {
                InventoryQuantityStat(
                    label = stringResource(R.string.inventory_query_qty_available),
                    value = item.quantityAvailable,
                    modifier = Modifier.weight(1f)
                )
                InventoryQuantityStat(
                    label = stringResource(R.string.inventory_query_qty_occupied),
                    value = item.quantityOccupied,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.FieldSpacing)
            ) {
                InventoryQuantityStat(
                    label = stringResource(R.string.inventory_query_qty_defective),
                    value = item.quantityDefective,
                    modifier = Modifier.weight(1f)
                )
                InventoryQuantityStat(
                    label = stringResource(R.string.inventory_query_qty_frozen),
                    value = item.quantityFrozen,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.FieldSpacing)
            ) {
                InventoryDetailField(
                    label = stringResource(R.string.inventory_field_expiry_date),
                    value = expiryValue,
                    modifier = Modifier.weight(1f)
                )
                InventoryDetailField(
                    label = stringResource(R.string.inventory_field_batch_number),
                    value = batchValue,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(InventoryQueryUiCompact.FieldSpacing)
            ) {
                InventoryDetailField(
                    label = stringResource(R.string.inventory_field_client),
                    value = clientValue,
                    modifier = Modifier.weight(1f),
                    subtle = true
                )
                InventoryDetailField(
                    label = stringResource(R.string.inventory_field_asn),
                    value = asnValue,
                    modifier = Modifier.weight(1f),
                    subtle = true
                )
            }
        }
    }
}

@Composable
private fun InventoryPrimaryInfo(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    emphasize: Boolean = false,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = if (emphasize) MaterialTheme.typography.titleLarge else MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = if (emphasize) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun InventoryDetailField(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    subtle: Boolean = false,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            style = if (subtle) MaterialTheme.typography.labelSmall else MaterialTheme.typography.bodySmall,
            color = if (subtle) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun InventoryQuantityStat(
    label: String,
    value: Int,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 10.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value.toString(),
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
