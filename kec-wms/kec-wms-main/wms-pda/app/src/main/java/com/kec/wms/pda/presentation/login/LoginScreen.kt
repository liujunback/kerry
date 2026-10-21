package com.kec.wms.pda.presentation.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kec.wms.pda.BuildConfig
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.LoginUserInfo
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant
import com.kec.wms.pda.presentation.common.PdaTextField
import com.kec.wms.pda.presentation.common.requestFocusSafely

/**
 * 登录界面
 */
@Composable
fun LoginScreen(
    onLoginSuccess: (LoginUserInfo?, String, String) -> Unit,
    viewModel: LoginViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val keyboardController = LocalSoftwareKeyboardController.current
    val focusManager = LocalFocusManager.current

    // 焦点管理
    val tenantCodeFocus = remember { FocusRequester() }
    val usernameFocus = remember { FocusRequester() }
    val passwordFocus = remember { FocusRequester() }

    var tenantCode by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showQrScanDialog by remember { mutableStateOf(false) }
    var qrCodeInput by remember { mutableStateOf("") }

    // 登录操作
    val performLogin = {
        if (tenantCode.isNotBlank() && username.isNotBlank() && password.isNotBlank()) {
            keyboardController?.hide()
            focusManager.clearFocus()
            viewModel.login(tenantCode, username, password)
        }
    }

    // 加载保存的登录信息
    LaunchedEffect(uiState.savedTenantCode, uiState.savedUsername) {
        if (uiState.savedTenantCode.isNotEmpty()) {
            tenantCode = uiState.savedTenantCode
        } else {
            tenantCode = "DEFAULT"
        }
        if (uiState.savedUsername.isNotEmpty()) {
            username = uiState.savedUsername
        }
    }

    // 监听登录成功
    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) {
            onLoginSuccess(uiState.user, tenantCode, username)
            viewModel.resetLoginState()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        MaterialTheme.colorScheme.background,
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                        MaterialTheme.colorScheme.surface
                    )
                )
            )
    ) {
        Text(
            text = stringResource(R.string.home_version_format, BuildConfig.VERSION_NAME),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 10.dp),
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f)
        )
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            LoginHeader()
            Spacer(modifier = Modifier.height(18.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    PdaTextField(
                        value = tenantCode,
                        onValueChange = { tenantCode = it },
                        focusRequester = tenantCodeFocus,
                        label = stringResource(R.string.login_tenant_code),
                        enabled = !uiState.isLoading,
                        suppressSoftKeyboardOnFocus = false,
                        imeAction = ImeAction.Next,
                        onImeAction = { usernameFocus.requestFocus() },
                        height = 56.dp
                    )

                    PdaTextField(
                        value = username,
                        onValueChange = { username = it },
                        focusRequester = usernameFocus,
                        label = stringResource(R.string.login_username),
                        enabled = !uiState.isLoading,
                        suppressSoftKeyboardOnFocus = false,
                        imeAction = ImeAction.Next,
                        onImeAction = { passwordFocus.requestFocus() },
                        height = 56.dp
                    )

                    PdaTextField(
                        value = password,
                        onValueChange = { password = it },
                        focusRequester = passwordFocus,
                        label = stringResource(R.string.login_password),
                        isPassword = true,
                        enabled = !uiState.isLoading,
                        suppressSoftKeyboardOnFocus = false,
                        imeAction = ImeAction.Done,
                        onImeAction = { performLogin() },
                        height = 56.dp
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = uiState.rememberMe,
                                onCheckedChange = { viewModel.updateRememberMe(it) },
                                enabled = !uiState.isLoading
                            )
                            Text(
                                text = stringResource(R.string.login_remember_info),
                                fontSize = 14.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        PdaButton(
                            text = stringResource(R.string.login_qr_sign_in),
                            onClick = { showQrScanDialog = true },
                            enabled = !uiState.isLoading,
                            variant = PdaButtonVariant.Text,
                            fillMaxWidth = false,
                            height = 36.dp,
                            fontSize = 13.sp
                        )
                    }

                    if (uiState.error != null) {
                        Surface(
                            modifier = Modifier.fillMaxWidth(),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.9f),
                            shape = RoundedCornerShape(18.dp)
                        ) {
                            Text(
                                text = uiState.error ?: "",
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                                fontSize = 14.sp,
                                textAlign = TextAlign.Start
                            )
                        }
                    }

                    PdaButton(
                        text = if (uiState.isLoading) {
                            stringResource(R.string.login_signing_in)
                        } else {
                            stringResource(R.string.login_sign_in)
                        },
                        onClick = { performLogin() },
                        enabled = !uiState.isLoading &&
                                tenantCode.isNotBlank() &&
                                username.isNotBlank() &&
                                password.isNotBlank(),
                        height = 52.dp
                    )

                    if (uiState.isLoading) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 2.dp),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.5.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = stringResource(R.string.login_validating),
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }

    // 扫码登录对话框
    if (showQrScanDialog) {
        val qrInputFocus = remember { FocusRequester() }

        // 自动聚焦输入框
        LaunchedEffect(Unit) {
            qrInputFocus.requestFocusSafely()
        }

        AlertDialog(
            onDismissRequest = {
                showQrScanDialog = false
                qrCodeInput = ""
            },
            title = {
                Text(stringResource(R.string.login_qr_sign_in))
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = stringResource(R.string.login_qr_dialog_tip),
                        fontSize = 14.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    OutlinedTextField(
                        value = qrCodeInput,
                        onValueChange = { newValue ->
                            // 扫码枪通常会在末尾追加换行符，检测到换行符时自动登录
                            if (newValue.contains("\n") || newValue.contains("\r")) {
                                val cleanedCode = newValue.trim()
                                if (cleanedCode.isNotBlank()) {
                                    viewModel.qrCodeLogin(cleanedCode)
                                    showQrScanDialog = false
                                    qrCodeInput = ""
                                }
                            } else {
                                qrCodeInput = newValue
                            }
                        },
                        label = { Text(stringResource(R.string.login_qr_waiting)) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(qrInputFocus),
                        singleLine = false,
                        minLines = 2
                    )
                }
            },
            confirmButton = {
                PdaButton(
                    text = stringResource(R.string.login_sign_in),
                    onClick = {
                        if (qrCodeInput.isNotBlank()) {
                            viewModel.qrCodeLogin(qrCodeInput.trim())
                            showQrScanDialog = false
                            qrCodeInput = ""
                        }
                    },
                    enabled = qrCodeInput.isNotBlank(),
                    fillMaxWidth = false
                )
            },
            dismissButton = {
                PdaButton(
                    text = stringResource(R.string.common_cancel),
                    onClick = {
                        showQrScanDialog = false
                        qrCodeInput = ""
                    },
                    variant = PdaButtonVariant.Secondary,
                    fillMaxWidth = false
                )
            }
        )
    }
}

@Composable
private fun LoginHeader() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Surface(
            modifier = Modifier.size(58.dp),
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.primary
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.Filled.Inventory2,
                    contentDescription = null,
                    modifier = Modifier.size(28.dp),
                    tint = MaterialTheme.colorScheme.onPrimary
                )
            }
        }
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
            ) {
                Text(
                    text = stringResource(R.string.brand_kec_wms),
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            Text(
                text = stringResource(R.string.login_header_title),
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}
