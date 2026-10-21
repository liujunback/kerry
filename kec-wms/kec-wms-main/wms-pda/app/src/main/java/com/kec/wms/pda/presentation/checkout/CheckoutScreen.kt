package com.kec.wms.pda.presentation.checkout

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.CheckoutRecordSummary
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely

private const val ViewMenu = "MENU"
private const val ViewForm = "FORM"
private const val PalletType = "PALLET"
private const val BagType = "BAG"

@Composable
fun CheckoutScreen(
    uiState: CheckoutUiState,
    onCheckoutTypeChange: (String) -> Unit,
    onOpenContainer: (String) -> Unit,
    onSubmitCheckout: (String, String) -> Unit,
    onConfirmCheckout: () -> Unit,
    onResetWorkspace: () -> Unit,
    onBack: () -> Unit
) {
    var currentView by rememberSaveable { mutableStateOf(ViewMenu) }
    var selectedType by rememberSaveable { mutableStateOf(uiState.checkoutType) }
    var containerNumber by rememberSaveable { mutableStateOf(uiState.containerNumber) }
    var scannedNumber by rememberSaveable { mutableStateOf("") }
    val containerFocus = remember { FocusRequester() }
    val scanFocus = remember { FocusRequester() }
    val isBusy = uiState.isLoading || uiState.isScanning || uiState.confirmAction.isRunning
    val containerLabel = stringResource(
        if (selectedType == PalletType) R.string.checkout_pallet_label else R.string.checkout_bag_label
    )
    val formTitle = stringResource(
        if (selectedType == PalletType) R.string.checkout_pallet_title else R.string.checkout_bag_title
    )
    val isCurrentContainerCheckedOut = uiState.status == "CHECKED_OUT" &&
        uiState.containerNumber == containerNumber.trim()

    LaunchedEffect(uiState.checkoutType) {
        selectedType = uiState.checkoutType
    }

    LaunchedEffect(uiState.containerNumber) {
        if (uiState.containerNumber.isNotBlank()) {
            containerNumber = uiState.containerNumber
        }
    }

    LaunchedEffect(currentView, uiState.workspaceId, uiState.status) {
        if (currentView == ViewForm) {
            when {
                uiState.workspaceId.isNullOrBlank() -> containerFocus.requestFocusSafely()
                uiState.status != "CHECKED_OUT" -> scanFocus.requestFocusSafely()
            }
        }
    }

    LaunchedEffect(uiState.successMessage) {
        if (uiState.successMessage != null) {
            scannedNumber = ""
            if (currentView == ViewForm && uiState.workspaceId != null && uiState.status != "CHECKED_OUT") {
                scanFocus.requestFocusSafely()
            }
        }
    }

    fun openType(type: String) {
        selectedType = type
        containerNumber = ""
        scannedNumber = ""
        currentView = ViewForm
        onCheckoutTypeChange(type)
        onResetWorkspace()
    }

    fun backToMenu() {
        currentView = ViewMenu
        containerNumber = ""
        scannedNumber = ""
        onResetWorkspace()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        CheckoutHeader(
            title = if (currentView == ViewMenu) stringResource(R.string.checkout_title) else formTitle,
            onBack = {
                if (currentView == ViewMenu) {
                    onBack()
                } else {
                    backToMenu()
                }
            }
        )

        if (currentView == ViewMenu) {
            CheckoutMenu(
                onPalletClick = { openType(PalletType) },
                onBagClick = { openType(BagType) }
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 14.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Card(
                    border = BorderStroke(
                        width = 1.dp,
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        PdaTextField(
                            value = containerNumber,
                            onValueChange = { containerNumber = it },
                            focusRequester = containerFocus,
                            label = containerLabel,
                            imeAction = ImeAction.Next,
                            onImeAction = { onOpenContainer(containerNumber) },
                            submitOnLineBreak = true,
                            onLineBreakSubmit = onOpenContainer,
                            enabled = !isBusy,
                            suppressSoftKeyboardOnFocus = true,
                            height = 60.dp
                        )

                        PdaTextField(
                            value = scannedNumber,
                            onValueChange = { scannedNumber = it },
                            focusRequester = scanFocus,
                            label = stringResource(R.string.checkout_scan_number_label),
                            imeAction = ImeAction.Done,
                            onImeAction = { onSubmitCheckout(containerNumber, scannedNumber) },
                            submitOnLineBreak = true,
                            onLineBreakSubmit = { cleaned -> onSubmitCheckout(containerNumber, cleaned) },
                            enabled = !isBusy && !isCurrentContainerCheckedOut,
                            suppressSoftKeyboardOnFocus = true,
                            height = 60.dp
                        )

                        PdaButton(
                            text = when {
                                uiState.isLoading -> stringResource(R.string.checkout_preparing)
                                uiState.isScanning -> stringResource(R.string.checkout_processing)
                                else -> stringResource(R.string.checkout_action)
                            },
                            onClick = {
                                if (scannedNumber.isBlank()) {
                                    onOpenContainer(containerNumber)
                                } else {
                                    onSubmitCheckout(containerNumber, scannedNumber)
                                }
                            },
                            enabled = !isBusy && !isCurrentContainerCheckedOut
                        )

                        if (isBusy) {
                            Box(
                                modifier = Modifier.fillMaxWidth(),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(modifier = Modifier.size(36.dp))
                            }
                        }
                    }
                }

                CheckoutSummaryCard(
                    uiState = uiState
                )

                uiState.error?.let { error ->
                    PdaFeedbackBanner(
                        message = error,
                        title = stringResource(R.string.checkout_feedback_error),
                        tone = PdaFeedbackTone.Error
                    )
                }

                uiState.successMessage?.let { message ->
                    PdaFeedbackBanner(
                        message = message,
                        title = stringResource(R.string.checkout_feedback_success),
                        tone = PdaFeedbackTone.Success
                    )
                }

                if (uiState.records.isNotEmpty()) {
                    Card {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = stringResource(R.string.checkout_records),
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold
                            )

                            uiState.records.forEach { record ->
                                CheckoutRecordCard(record = record)
                            }
                        }
                    }
                }

                if (uiState.records.isNotEmpty() && uiState.status != "CHECKED_OUT") {
                    PdaButton(
                        text = stringResource(
                            if (selectedType == PalletType) {
                                R.string.checkout_complete_pallet
                            } else {
                                R.string.checkout_complete_bag
                            }
                        ),
                        onClick = onConfirmCheckout,
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isBusy,
                        isLoading = uiState.confirmAction.isRunning,
                        variant = PdaButtonVariant.Secondary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun CheckoutHeader(
    title: String,
    onBack: () -> Unit
) {
    PdaTopBar(title = title, onBack = onBack)
}

@Composable
private fun CheckoutMenu(
    onPalletClick: () -> Unit,
    onBagClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 22.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(36.dp))

        MenuActionButton(
            text = stringResource(R.string.checkout_menu_pallet),
            onClick = onPalletClick
        )

        Spacer(modifier = Modifier.height(36.dp))

        MenuActionButton(
            text = stringResource(R.string.checkout_menu_bag),
            onClick = onBagClick
        )
    }
}

@Composable
private fun MenuActionButton(
    text: String,
    onClick: () -> Unit
) {
    PdaButton(
        text = text,
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp)
    )
}

@Composable
private fun CheckoutSummaryCard(
    uiState: CheckoutUiState
) {
    Card(
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
        ),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = stringResource(R.string.checkout_scan_count),
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )

            Text(
                text = uiState.records.size.toString(),
                fontSize = 34.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun CheckoutRecordCard(record: CheckoutRecordSummary) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = stringResource(
                    R.string.checkout_record_number_format,
                    record.trackingNumber ?: record.orderNumber ?: record.scannedNumber
                ),
                fontWeight = FontWeight.Bold
            )
            Text(
                text = stringResource(
                    R.string.checkout_record_scan_time_format,
                    formatScanTime(record.scannedAt)
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

private fun formatScanTime(rawValue: String?): String {
    val value = rawValue?.trim().orEmpty()
    if (value.isBlank()) return "-"

    if ('T' in value) {
        val timePart = value.substringAfter('T')
            .substringBefore('.')
            .substringBefore('Z')
            .substringBefore('+')
            .substringBefore('-')
        if (timePart.isNotBlank()) {
            return timePart.take(8)
        }
    }

    if (' ' in value) {
        return value.substringAfterLast(' ').take(8)
    }

    return value
}
