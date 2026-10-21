package com.kec.wms.pda.presentation.receiving

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
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
import com.kec.wms.pda.data.model.AsnDetail
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.common.requestFocusSafely

@Composable
fun AsnSignInScreen(
    uiState: AsnSignInUiState,
    onSubmitSignIn: (String) -> Unit,
    onResetState: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    var asnNumber by rememberSaveable { mutableStateOf("") }
    val asnInputFocus = remember { FocusRequester() }
    val signedAsn = uiState.signedAsn
    val isBusy = uiState.isSubmitting

    LaunchedEffect(signedAsn?.id) {
        if (signedAsn != null) {
            asnNumber = ""
        }
    }

    LaunchedEffect(signedAsn, isBusy) {
        if (!isBusy) {
            asnInputFocus.requestFocusSafely()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        AsnSignInHeader(
            title = stringResource(R.string.asn_sign_in_title),
            onBack = {
                asnNumber = ""
                onResetState()
                onBack()
            }
        )

        LookupContent(
            asnNumber = asnNumber,
            onAsnNumberChange = {
                if (uiState.error != null) {
                    onResetState()
                }
                asnNumber = it
            },
            onSubmit = { submittedAsn ->
                onSubmitSignIn(submittedAsn)
            },
            isBusy = isBusy,
            signedAsn = signedAsn,
            successMessage = uiState.successMessage,
            error = uiState.error,
            focusRequester = asnInputFocus
        )
    }
}

@Composable
private fun AsnSignInHeader(
    title: String,
    onBack: () -> Unit
) {
    PdaTopBar(title = title, onBack = onBack)
}

@Composable
private fun LookupContent(
    asnNumber: String,
    onAsnNumberChange: (String) -> Unit,
    onSubmit: (String) -> Unit,
    isBusy: Boolean,
    signedAsn: AsnDetail?,
    successMessage: String?,
    error: String?,
    focusRequester: FocusRequester
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PdaTextField(
                    value = asnNumber,
                    onValueChange = onAsnNumberChange,
                    focusRequester = focusRequester,
                    label = stringResource(R.string.asn_sign_in_placeholder),
                    imeAction = ImeAction.Done,
                    onImeAction = { onSubmit(asnNumber) },
                    submitOnLineBreak = true,
                    onLineBreakSubmit = onSubmit,
                    enabled = !isBusy,
                    suppressSoftKeyboardOnFocus = true,
                    height = 60.dp
                )

                if (isBusy) {
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(34.dp))
                    }
                }

                error?.let {
                    PdaFeedbackBanner(
                        message = it,
                        title = stringResource(R.string.asn_sign_in_failed),
                        tone = PdaFeedbackTone.Error
                    )
                }
            }
        }

        signedAsn?.let { asn ->
            Spacer(modifier = Modifier.height(8.dp))

            successMessage?.let { message ->
                PdaFeedbackBanner(
                    message = message,
                    title = stringResource(R.string.asn_sign_in_success_title),
                    tone = PdaFeedbackTone.Success
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            SuccessDetailCard(asn = asn)
        }

        Spacer(modifier = Modifier.weight(1f))
    }
}

@Composable
private fun SuccessDetailCard(asn: AsnDetail) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            DetailField(
                label = stringResource(R.string.asn_sign_in_asn_number),
                value = asn.asnNumber
            )

            DetailField(
                label = stringResource(R.string.asn_sign_in_client_name),
                value = asn.client?.clientName ?: "-"
            )

            DetailField(
                label = stringResource(R.string.asn_sign_in_summary),
                value = stringResource(
                    R.string.asn_sign_in_summary_format,
                    asn.totalExpectedQty,
                    asn.totalExpectedLines
                )
            )

            DetailField(
                label = stringResource(R.string.asn_sign_in_signed_time),
                value = formatSignedTime(asn.signedAt)
            )
        }
    }
}

private fun formatSignedTime(signedAt: String?): String {
    val value = signedAt?.trim().orEmpty()
    if (value.isEmpty()) {
        return "-"
    }

    return value.substringAfterLast(' ', value)
}

@Composable
private fun DetailField(
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .wrapContentHeight()
            .padding(vertical = 1.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "$label:",
            modifier = Modifier.width(96.dp),
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            modifier = Modifier
                .weight(1f)
                .padding(start = 6.dp),
            fontSize = 15.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
