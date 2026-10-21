package com.kec.wms.pda.presentation.manifest

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.ManifestMountRecordSummary
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely

@Composable
fun ManifestMountScreen(
    uiState: ManifestMountUiState,
    onValidateManifest: (String) -> Unit,
    onScanCheckout: (String) -> Unit,
    onConfirmManifest: () -> Unit,
    onBack: () -> Unit
) {
    var manifestNumber by rememberSaveable { mutableStateOf(uiState.manifestNumber) }
    var checkoutNumber by rememberSaveable { mutableStateOf("") }
    val manifestFocus = remember { FocusRequester() }
    val checkoutFocus = remember { FocusRequester() }
    val isBusy = uiState.isLoading || uiState.isScanning || uiState.confirmAction.isRunning
    val hasManifestContext = !uiState.manifestOrderId.isNullOrBlank()

    LaunchedEffect(uiState.manifestNumber, hasManifestContext) {
        if (uiState.manifestNumber.isNotBlank()) {
            manifestNumber = uiState.manifestNumber
        } else if (!hasManifestContext) {
            manifestNumber = ""
        }
    }

    LaunchedEffect(hasManifestContext, uiState.error, uiState.successMessage) {
        if (hasManifestContext) {
            checkoutFocus.requestFocusSafely()
        } else {
            manifestFocus.requestFocusSafely()
        }
    }

    LaunchedEffect(uiState.successMessage, uiState.error, hasManifestContext) {
        if (hasManifestContext) {
            checkoutNumber = ""
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        PdaTopBar(
            title = stringResource(R.string.manifest_mount_title),
            onBack = {
                onBack()
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 10.dp, vertical = 6.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Card(
                border = BorderStroke(
                    width = 1.dp,
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                )
            ) {
                Column(
                    modifier = Modifier.padding(8.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    PdaTextField(
                        value = manifestNumber,
                        onValueChange = { manifestNumber = it },
                        focusRequester = manifestFocus,
                        label = stringResource(R.string.manifest_mount_manifest_label),
                        placeholder = stringResource(R.string.manifest_mount_manifest_placeholder),
                        imeAction = ImeAction.Next,
                        onImeAction = { onValidateManifest(manifestNumber) },
                        submitOnLineBreak = true,
                        onLineBreakSubmit = onValidateManifest,
                        enabled = !isBusy && !hasManifestContext,
                        suppressSoftKeyboardOnFocus = true,
                        height = 48.dp
                    )

                    if (hasManifestContext) {
                        ManifestSummaryCard(uiState = uiState)
                    }

                    PdaTextField(
                        value = checkoutNumber,
                        onValueChange = { checkoutNumber = it },
                        focusRequester = checkoutFocus,
                        label = stringResource(R.string.manifest_mount_checkout_label),
                        placeholder = stringResource(R.string.manifest_mount_checkout_placeholder),
                        imeAction = ImeAction.Done,
                        onImeAction = { onScanCheckout(checkoutNumber) },
                        submitOnLineBreak = true,
                        onLineBreakSubmit = onScanCheckout,
                        enabled = !isBusy && hasManifestContext,
                        suppressSoftKeyboardOnFocus = true,
                        height = 48.dp
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

            uiState.error?.let { error ->
                PdaFeedbackBanner(
                    message = error,
                    tone = PdaFeedbackTone.Error
                )
            }

            uiState.successMessage?.let { message ->
                PdaFeedbackBanner(
                    message = message,
                    tone = PdaFeedbackTone.Success
                )
            }

            if (uiState.records.isNotEmpty()) {
                Card {
                    Column(
                        modifier = Modifier.padding(8.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Text(
                            text = stringResource(R.string.manifest_mount_records),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )

                        uiState.records.forEach { record ->
                            ManifestRecordCard(record)
                        }
                    }
                }
            }

            PdaButton(
                text = if (uiState.confirmAction.isRunning) {
                    stringResource(R.string.manifest_mount_completing)
                } else {
                    stringResource(R.string.manifest_mount_complete_action)
                },
                onClick = onConfirmManifest,
                modifier = Modifier.fillMaxWidth(),
                enabled = hasManifestContext && uiState.records.isNotEmpty() && !isBusy,
                isLoading = uiState.confirmAction.isRunning,
                variant = PdaButtonVariant.Secondary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun ManifestSummaryCard(
    uiState: ManifestMountUiState
) {
    val placeholder = stringResource(R.string.putaway_value_placeholder)
    val warehouseText = uiState.warehouseName.orEmpty().ifBlank { placeholder }
    val channelText = uiState.channelName.orEmpty().ifBlank { placeholder }

    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(6.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                ManifestCompactInfo(
                    label = stringResource(R.string.manifest_mount_warehouse),
                    value = warehouseText,
                    modifier = Modifier.weight(1f)
                )
                ManifestCompactInfo(
                    label = stringResource(R.string.manifest_mount_channel),
                    value = channelText,
                    modifier = Modifier.weight(1f)
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                ManifestStatChip(
                    label = stringResource(R.string.manifest_mount_container_count),
                    value = uiState.containerCount.toString(),
                    modifier = Modifier.weight(1f)
                )
                ManifestStatChip(
                    label = stringResource(R.string.manifest_mount_order_count),
                    value = uiState.orderCount.toString(),
                    modifier = Modifier.weight(1f)
                )
                ManifestStatChip(
                    label = stringResource(R.string.manifest_mount_parcel_count),
                    value = uiState.parcelCount.toString(),
                    modifier = Modifier.weight(1f)
                )
            }
        }
    }
}

@Composable
private fun ManifestRecordCard(record: ManifestMountRecordSummary) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(6.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
            Text(
                text = stringResource(
                    R.string.manifest_mount_record_number_format,
                    record.checkoutNumber
                ),
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp
            )
            Text(
                text = stringResource(
                    R.string.manifest_mount_record_count_format,
                    record.orderCount,
                    record.parcelCount
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 12.sp
            )
            Text(
                text = stringResource(
                    R.string.manifest_mount_record_scan_time_format,
                    formatScanTime(record.scannedAt)
                ),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
private fun ManifestCompactInfo(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        Text(
            text = label,
            fontSize = 10.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
private fun ManifestStatChip(
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
        )
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 5.dp),
            verticalArrangement = Arrangement.spacedBy(1.dp)
        ) {
            Text(
                text = label,
                fontSize = 8.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = value,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
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
