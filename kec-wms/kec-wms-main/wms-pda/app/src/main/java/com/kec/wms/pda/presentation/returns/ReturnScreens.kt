package com.kec.wms.pda.presentation.returns

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.ReturnOrder
import com.kec.wms.pda.data.model.ReturnOrderLine
import com.kec.wms.pda.data.model.ReturnOutboundOrder
import com.kec.wms.pda.data.model.ReturnPutawayOrder
import com.kec.wms.pda.data.model.WarehouseInfo
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
import java.io.File

private object ReturnUiCompact {
    val PagePadding = 8.dp
    val SectionSpacing = 8.dp
    val CardPadding = 10.dp
    val FieldSpacing = 8.dp
    val InputHeight = 44.dp
    val ButtonHeight = 44.dp
}

@Composable
fun ReturnSignInScreen(
    uiState: ReturnSignInUiState,
    onLogisticsNoChange: (String) -> Unit,
    onLookup: () -> Unit,
    onConfirm: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val logisticsRequester = remember { FocusRequester() }
    val canConfirm = uiState.lookupResult?.matchType?.let {
        it == "PRE_RETURN" || it == "OUTBOUND_ORDER"
    } == true
    LaunchedEffect(Unit) {
        logisticsRequester.requestFocusSafely()
    }

    Scaffold(
        topBar = {
            PdaTopBar(
                title = stringResource(R.string.return_sign_in_title),
                onBack = onBack
            )
        },
        bottomBar = {
            PdaBottomActionBar {
                PdaBottomBarPrimaryButton(
                    text = stringResource(R.string.return_action_confirm_sign_in),
                    onClick = onConfirm,
                    enabled = !uiState.isLoading && !uiState.isSubmitting && canConfirm,
                    isLoading = uiState.isSubmitting,
                    height = ReturnUiCompact.ButtonHeight
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(ReturnUiCompact.PagePadding)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.SectionSpacing)
        ) {
            Card {
                Column(
                    modifier = Modifier.padding(ReturnUiCompact.CardPadding),
                    verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
                ) {
                    PdaTextField(
                        value = uiState.logisticsNo,
                        onValueChange = onLogisticsNoChange,
                        focusRequester = logisticsRequester,
                        label = stringResource(R.string.return_field_logistics_no),
                        submitOnLineBreak = true,
                        onLineBreakSubmit = { onLookup() },
                        onImeAction = onLookup,
                        imeAction = ImeAction.Search,
                        height = ReturnUiCompact.InputHeight
                    )
                    PdaButton(
                        text = stringResource(R.string.return_action_lookup),
                        onClick = onLookup,
                        enabled = !uiState.isLoading,
                        isLoading = uiState.isLoading,
                        height = ReturnUiCompact.ButtonHeight
                    )
                }
            }

            uiState.lookupResult?.returnOrder?.let {
                ReturnOrderCard(order = it, title = stringResource(R.string.return_sign_in_pre_return_title))
            }
            uiState.lookupResult?.outboundOrder?.let {
                ReturnOutboundOrderCard(order = it)
            }
            uiState.signedOrder?.let {
                ReturnOrderCard(order = it, title = stringResource(R.string.return_sign_in_signed_title))
            }
            uiState.feedbackMessage?.let { message ->
                PdaFeedbackBanner(
                    message = message,
                    title = feedbackTitle(uiState.feedbackTone),
                    tone = uiState.feedbackTone
                )
            }
        }
    }
}

@Composable
fun ReturnCountingScreen(
    uiState: ReturnCountingUiState,
    onLogisticsNoChange: (String) -> Unit,
    onLookup: () -> Unit,
    onBarcodeChange: (String) -> Unit,
    onCountedQtyChange: (String) -> Unit,
    onQualityChange: (String) -> Unit,
    onBatchNumberChange: (String) -> Unit,
    onExpiryDateChange: (String) -> Unit,
    onContainerCodeChange: (String) -> Unit,
    onTempLocationCodeChange: (String) -> Unit,
    onPhotoCaptured: (File) -> Unit,
    onSubmitLine: () -> Unit,
    onCompleteCounting: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val logisticsRequester = remember { FocusRequester() }
    val barcodeRequester = remember { FocusRequester() }
    var pendingPhotoFile by remember { mutableStateOf<File?>(null) }
    val photoLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val file = pendingPhotoFile
        if (success && file != null) {
            onPhotoCaptured(file)
        }
    }

    fun launchPhotoCapture() {
        val dir = File(context.cacheDir, "returns-photos")
        dir.mkdirs()
        val file = File(dir, "return-${System.currentTimeMillis()}.jpg")
        pendingPhotoFile = file
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        photoLauncher.launch(uri)
    }

    LaunchedEffect(Unit) {
        logisticsRequester.requestFocusSafely()
    }
    LaunchedEffect(uiState.order?.id) {
        if (uiState.order != null) {
            barcodeRequester.requestFocusSafely()
        }
    }

    Scaffold(
        topBar = {
            PdaTopBar(
                title = stringResource(R.string.return_counting_title),
                onBack = onBack
            )
        },
        bottomBar = {
            PdaBottomActionBar {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
                ) {
                    PdaButton(
                        text = stringResource(R.string.return_action_submit_line),
                        onClick = onSubmitLine,
                        enabled = !uiState.isSubmitting && !uiState.isCompleting && uiState.order != null,
                        isLoading = uiState.isSubmitting,
                        height = ReturnUiCompact.ButtonHeight,
                        modifier = Modifier.weight(1f),
                        fillMaxWidth = false
                    )
                    PdaButton(
                        text = stringResource(R.string.return_action_complete_counting),
                        onClick = onCompleteCounting,
                        enabled = !uiState.isSubmitting && !uiState.isCompleting && uiState.order != null,
                        isLoading = uiState.isCompleting,
                        height = ReturnUiCompact.ButtonHeight,
                        modifier = Modifier.weight(1f),
                        fillMaxWidth = false,
                        variant = PdaButtonVariant.Secondary
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
                .padding(ReturnUiCompact.PagePadding)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.SectionSpacing)
        ) {
            Card {
                Column(
                    modifier = Modifier.padding(ReturnUiCompact.CardPadding),
                    verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
                ) {
                    PdaTextField(
                        value = uiState.logisticsNo,
                        onValueChange = onLogisticsNoChange,
                        focusRequester = logisticsRequester,
                        label = stringResource(R.string.return_field_logistics_no),
                        submitOnLineBreak = true,
                        onLineBreakSubmit = { onLookup() },
                        onImeAction = onLookup,
                        imeAction = ImeAction.Search,
                        height = ReturnUiCompact.InputHeight
                    )
                    PdaButton(
                        text = stringResource(R.string.return_action_lookup),
                        onClick = onLookup,
                        enabled = !uiState.isLoading,
                        isLoading = uiState.isLoading,
                        height = ReturnUiCompact.ButtonHeight
                    )
                }
            }

            uiState.order?.let { order ->
                ReturnOrderCard(order = order, title = stringResource(R.string.return_counting_current_order_title))
                ReturnCountingForm(
                    uiState = uiState,
                    barcodeRequester = barcodeRequester,
                    onBarcodeChange = onBarcodeChange,
                    onCountedQtyChange = onCountedQtyChange,
                    onQualityChange = onQualityChange,
                    onBatchNumberChange = onBatchNumberChange,
                    onExpiryDateChange = onExpiryDateChange,
                    onContainerCodeChange = onContainerCodeChange,
                    onTempLocationCodeChange = onTempLocationCodeChange,
                    onTakePhoto = ::launchPhotoCapture
                )
            }

            uiState.feedbackMessage?.let { message ->
                PdaFeedbackBanner(
                    message = message,
                    title = feedbackTitle(uiState.feedbackTone),
                    tone = uiState.feedbackTone
                )
            }
        }
    }
}

@Composable
fun ReturnPutawayScreen(
    uiState: ReturnPutawayUiState,
    onPutawayOrderNumberChange: (String) -> Unit,
    onScanOrder: () -> Unit,
    onSelectOrder: (ReturnPutawayOrder) -> Unit,
    onContainerCodeChange: (String) -> Unit,
    onLogisticsNoChange: (String) -> Unit,
    onBarcodeChange: (String) -> Unit,
    onQualityChange: (String) -> Unit,
    onQuantityChange: (String) -> Unit,
    onTargetLocationCodeChange: (String) -> Unit,
    onRefresh: () -> Unit,
    onExecute: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val orderRequester = remember { FocusRequester() }
    val targetLocationRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) {
        orderRequester.requestFocusSafely()
    }
    LaunchedEffect(uiState.selectedOrder?.id) {
        if (uiState.selectedOrder != null) {
            targetLocationRequester.requestFocusSafely()
        }
    }

    Scaffold(
        topBar = {
            PdaTopBar(
                title = stringResource(R.string.return_putaway_title),
                onBack = onBack
            )
        },
        bottomBar = {
            PdaBottomActionBar {
                PdaBottomBarPrimaryButton(
                    text = stringResource(R.string.return_action_confirm_putaway),
                    onClick = onExecute,
                    enabled = !uiState.isSubmitting && uiState.selectedOrder != null,
                    isLoading = uiState.isSubmitting,
                    height = ReturnUiCompact.ButtonHeight
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(ReturnUiCompact.PagePadding)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.SectionSpacing)
        ) {
            Card {
                Column(
                    modifier = Modifier.padding(ReturnUiCompact.CardPadding),
                    verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
                ) {
                    PdaTextField(
                        value = uiState.putawayOrderNumber,
                        onValueChange = onPutawayOrderNumberChange,
                        focusRequester = orderRequester,
                        label = stringResource(R.string.return_field_putaway_order_number),
                        submitOnLineBreak = true,
                        onLineBreakSubmit = { onScanOrder() },
                        onImeAction = onScanOrder,
                        imeAction = ImeAction.Search,
                        height = ReturnUiCompact.InputHeight
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
                    ) {
                        PdaButton(
                            text = stringResource(R.string.return_action_scan_order),
                            onClick = onScanOrder,
                            height = ReturnUiCompact.ButtonHeight,
                            modifier = Modifier.weight(1f),
                            fillMaxWidth = false
                        )
                        PdaButton(
                            text = stringResource(R.string.return_action_refresh),
                            onClick = onRefresh,
                            enabled = !uiState.isLoading,
                            isLoading = uiState.isLoading,
                            height = ReturnUiCompact.ButtonHeight,
                            modifier = Modifier.weight(1f),
                            fillMaxWidth = false,
                            variant = PdaButtonVariant.Secondary
                        )
                    }
                }
            }

            ReturnPutawayForm(
                uiState = uiState,
                targetLocationRequester = targetLocationRequester,
                onContainerCodeChange = onContainerCodeChange,
                onLogisticsNoChange = onLogisticsNoChange,
                onBarcodeChange = onBarcodeChange,
                onQualityChange = onQualityChange,
                onQuantityChange = onQuantityChange,
                onTargetLocationCodeChange = onTargetLocationCodeChange,
                onExecute = onExecute
            )

            ReturnPutawayOrderList(
                orders = uiState.orders,
                onSelectOrder = onSelectOrder
            )

            uiState.feedbackMessage?.let { message ->
                PdaFeedbackBanner(
                    message = message,
                    title = feedbackTitle(uiState.feedbackTone),
                    tone = uiState.feedbackTone
                )
            }
        }
    }
}

@Composable
private fun ReturnCountingForm(
    uiState: ReturnCountingUiState,
    barcodeRequester: FocusRequester,
    onBarcodeChange: (String) -> Unit,
    onCountedQtyChange: (String) -> Unit,
    onQualityChange: (String) -> Unit,
    onBatchNumberChange: (String) -> Unit,
    onExpiryDateChange: (String) -> Unit,
    onContainerCodeChange: (String) -> Unit,
    onTempLocationCodeChange: (String) -> Unit,
    onTakePhoto: () -> Unit,
) {
    Card {
        Column(
            modifier = Modifier.padding(ReturnUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)) {
                PdaTextField(
                    value = uiState.containerCode,
                    onValueChange = onContainerCodeChange,
                    label = stringResource(R.string.return_field_container_code),
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
                PdaTextField(
                    value = uiState.tempLocationCode,
                    onValueChange = onTempLocationCodeChange,
                    label = stringResource(R.string.return_field_temp_location),
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
            }
            PdaTextField(
                value = uiState.barcode,
                onValueChange = onBarcodeChange,
                focusRequester = barcodeRequester,
                label = stringResource(R.string.return_field_barcode),
                submitOnLineBreak = true,
                onLineBreakSubmit = { },
                imeAction = ImeAction.Next,
                height = ReturnUiCompact.InputHeight
            )
            Row(horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)) {
                PdaTextField(
                    value = uiState.countedQty,
                    onValueChange = onCountedQtyChange,
                    label = stringResource(R.string.return_field_counted_qty),
                    keyboardType = KeyboardType.Number,
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
                ReturnQualitySelector(
                    quality = uiState.quality,
                    onQualityChange = onQualityChange,
                    modifier = Modifier.weight(1f)
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)) {
                PdaTextField(
                    value = uiState.batchNumber,
                    onValueChange = onBatchNumberChange,
                    label = stringResource(R.string.return_field_batch_number),
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
                PdaTextField(
                    value = uiState.expiryDate,
                    onValueChange = onExpiryDateChange,
                    label = stringResource(R.string.return_field_expiry_date),
                    placeholder = stringResource(R.string.return_placeholder_expiry_date),
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
            }
            PdaButton(
                text = stringResource(
                    R.string.return_action_take_photo_count,
                    uiState.photoUrls.size
                ),
                onClick = onTakePhoto,
                enabled = !uiState.isUploadingPhoto,
                isLoading = uiState.isUploadingPhoto,
                height = ReturnUiCompact.ButtonHeight,
                variant = if (uiState.quality == "DAMAGED") PdaButtonVariant.Primary else PdaButtonVariant.Secondary
            )
        }
    }
}

@Composable
private fun ReturnPutawayForm(
    uiState: ReturnPutawayUiState,
    targetLocationRequester: FocusRequester,
    onContainerCodeChange: (String) -> Unit,
    onLogisticsNoChange: (String) -> Unit,
    onBarcodeChange: (String) -> Unit,
    onQualityChange: (String) -> Unit,
    onQuantityChange: (String) -> Unit,
    onTargetLocationCodeChange: (String) -> Unit,
    onExecute: () -> Unit,
) {
    Card {
        Column(
            modifier = Modifier.padding(ReturnUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)) {
                PdaTextField(
                    value = uiState.containerCode,
                    onValueChange = onContainerCodeChange,
                    label = stringResource(R.string.return_field_container_code),
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
                PdaTextField(
                    value = uiState.logisticsNo,
                    onValueChange = onLogisticsNoChange,
                    label = stringResource(R.string.return_field_logistics_no),
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
            }
            PdaTextField(
                value = uiState.barcode,
                onValueChange = onBarcodeChange,
                label = stringResource(R.string.return_field_barcode),
                height = ReturnUiCompact.InputHeight
            )
            Row(horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)) {
                ReturnQualitySelector(
                    quality = uiState.quality,
                    onQualityChange = onQualityChange,
                    modifier = Modifier.weight(1f)
                )
                PdaTextField(
                    value = uiState.quantity,
                    onValueChange = onQuantityChange,
                    label = stringResource(R.string.return_field_putaway_qty),
                    keyboardType = KeyboardType.Number,
                    height = ReturnUiCompact.InputHeight,
                    modifier = Modifier.weight(1f)
                )
            }
            PdaTextField(
                value = uiState.targetLocationCode,
                onValueChange = onTargetLocationCodeChange,
                focusRequester = targetLocationRequester,
                label = stringResource(R.string.return_field_target_location),
                submitOnLineBreak = true,
                onLineBreakSubmit = { onExecute() },
                onImeAction = onExecute,
                imeAction = ImeAction.Done,
                height = ReturnUiCompact.InputHeight
            )
        }
    }
}

@Composable
private fun ReturnQualitySelector(
    quality: String,
    onQualityChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            text = stringResource(R.string.return_field_quality),
            style = MaterialTheme.typography.labelSmall
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(ReturnUiCompact.FieldSpacing)
        ) {
            PdaSelectionButton(
                text = stringResource(R.string.return_quality_good),
                selected = quality == "GOOD",
                onClick = { onQualityChange("GOOD") },
                selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.16f),
                selectedContentColor = MaterialTheme.colorScheme.primary,
                height = ReturnUiCompact.InputHeight,
                modifier = Modifier.weight(1f)
            )
            PdaSelectionButton(
                text = stringResource(R.string.return_quality_damaged),
                selected = quality == "DAMAGED",
                onClick = { onQualityChange("DAMAGED") },
                selectedContainerColor = MaterialTheme.colorScheme.error.copy(alpha = 0.14f),
                selectedContentColor = MaterialTheme.colorScheme.error,
                height = ReturnUiCompact.InputHeight,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun ReturnOrderCard(order: ReturnOrder, title: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(
            modifier = Modifier.padding(ReturnUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            ReturnMetaLine(label = stringResource(R.string.return_field_return_no), value = order.returnNo)
            ReturnMetaLine(label = stringResource(R.string.return_field_logistics_no), value = order.logisticsNo)
            ReturnMetaLine(label = stringResource(R.string.return_field_warehouse), value = formatWarehouseName(order.warehouse))
            ReturnMetaLine(label = stringResource(R.string.return_field_status), value = order.status)
            ReturnMetaLine(
                label = stringResource(R.string.return_field_client),
                value = order.client?.clientName ?: order.client?.clientCode ?: stringResource(R.string.inventory_value_placeholder)
            )
            ReturnMetaLine(label = stringResource(R.string.return_field_total_qty), value = "${order.totalCountedQty}/${order.totalExpectedQty}")
            ReturnLinePreview(lines = order.lines)
        }
    }
}

@Composable
private fun ReturnOutboundOrderCard(order: ReturnOutboundOrder) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(
            modifier = Modifier.padding(ReturnUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(stringResource(R.string.return_sign_in_outbound_title), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            ReturnMetaLine(label = stringResource(R.string.return_field_order_no), value = order.orderNumber)
            ReturnMetaLine(label = stringResource(R.string.return_field_warehouse), value = formatWarehouseName(order.warehouse))
            ReturnMetaLine(
                label = stringResource(R.string.return_field_platform_order),
                value = order.platformOrderId ?: stringResource(R.string.inventory_value_placeholder)
            )
            ReturnMetaLine(
                label = stringResource(R.string.return_field_client),
                value = order.client?.clientName ?: order.client?.clientCode ?: stringResource(R.string.inventory_value_placeholder)
            )
            order.lines.take(4).forEach { line ->
                Text(
                    text = stringResource(R.string.return_outbound_line_summary, line.skuCode, line.orderedQty),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}

@Composable
private fun ReturnLinePreview(lines: List<ReturnOrderLine>) {
    if (lines.isEmpty()) return
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = stringResource(R.string.return_field_lines),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold
        )
        lines.take(5).forEach { line ->
            Text(
                text = stringResource(
                    R.string.return_counting_line_summary,
                    line.skuCode,
                    line.countedQty,
                    line.expectedQty,
                    line.quality ?: stringResource(R.string.inventory_value_placeholder)
                ),
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun ReturnPutawayOrderList(
    orders: List<ReturnPutawayOrder>,
    onSelectOrder: (ReturnPutawayOrder) -> Unit,
) {
    Card {
        Column(
            modifier = Modifier.padding(ReturnUiCompact.CardPadding),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = stringResource(R.string.return_putaway_recent_orders_title),
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
            if (orders.isEmpty()) {
                Text(
                    text = stringResource(R.string.return_putaway_empty_orders),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            orders.forEach { order ->
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onSelectOrder(order) }
                        .padding(vertical = 6.dp),
                    verticalArrangement = Arrangement.spacedBy(2.dp)
                ) {
                    Text(order.putawayOrderNumber, fontWeight = FontWeight.Bold)
                    Text(
                        text = stringResource(
                            R.string.return_putaway_order_summary,
                            order.returnOrder.returnNo,
                            order.returnOrder.logisticsNo,
                            order.putawayQty,
                            order.totalQty
                        ),
                        style = MaterialTheme.typography.bodySmall
                    )
                    Text(
                        text = stringResource(
                            R.string.return_putaway_order_warehouse,
                            formatWarehouseName(order.warehouse ?: order.returnOrder.warehouse)
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    order.lines.take(3).forEach { line ->
                        Text(
                            text = stringResource(
                                R.string.return_putaway_line_summary,
                                line.skuCode,
                                line.quality,
                                line.remainingQty
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Box(modifier = Modifier.height(1.dp).fillMaxWidth().background(MaterialTheme.colorScheme.outlineVariant))
                }
            }
        }
    }
}

@Composable
private fun formatWarehouseName(warehouse: WarehouseInfo?): String {
    return warehouse?.warehouseName?.takeIf { it.isNotBlank() }
        ?: warehouse?.warehouseCode?.takeIf { it.isNotBlank() }
        ?: stringResource(R.string.inventory_value_placeholder)
}

@Composable
private fun ReturnMetaLine(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun feedbackTitle(tone: PdaFeedbackTone): String {
    return when (tone) {
        PdaFeedbackTone.Success -> stringResource(R.string.inventory_feedback_success)
        PdaFeedbackTone.Error -> stringResource(R.string.inventory_feedback_error)
        PdaFeedbackTone.Info -> stringResource(R.string.return_feedback_info)
    }
}
