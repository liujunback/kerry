package com.kec.wms.pda.presentation.common

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Backspace
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kec.wms.pda.R
import kotlinx.coroutines.android.awaitFrame

/**
 * PDA专用输入框
 * 默认高度56dp，字体18sp，方便输入
 * 支持密码可见性切换和键盘操作
 */
@Suppress("DEPRECATION")
@Composable
fun PdaTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    focusRequester: FocusRequester? = null,
    isPassword: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {},
    enabled: Boolean = true,
    suppressSoftKeyboardOnFocus: Boolean = true,
    singleLine: Boolean = true,
    showClearButton: Boolean = true,
    onClear: (() -> Unit)? = null,
    height: Dp = 56.dp,
    placeholder: String? = null,
    submitOnLineBreak: Boolean = false,
    onLineBreakSubmit: ((String) -> Unit)? = null,
    refocusOnClear: Boolean = true,
    showSoftKeyboard: Boolean = false,
    softKeyboardRequestKey: Any? = null,
    onFocusChanged: ((Boolean) -> Unit)? = null,
    selectAllOnFocus: Boolean = false,
    selectAllAfterSubmit: Boolean = false,
    selectAllRequestKey: Any? = null,
) {
    var passwordVisible by remember { mutableStateOf(false) }
    var isFocused by remember { mutableStateOf(false) }
    var operationKeyboardSessionActive by remember { mutableStateOf(false) }
    var handledSelectAllRequestKey by remember { mutableStateOf<Any?>(null) }
    var textFieldValue by remember {
        mutableStateOf(
            TextFieldValue(
                text = value,
                selection = TextRange(value.length)
            )
        )
    }
    val keyboardController = LocalSoftwareKeyboardController.current
    val fieldFocusRequester = focusRequester ?: remember { FocusRequester() }
    val operationKeyboardController = LocalOperationKeyboardController.current
    val operationKeyboardRequested =
        operationKeyboardController?.isKeyboardRequestedFor(fieldFocusRequester) == true
    val shouldShowSoftKeyboard = showSoftKeyboard || operationKeyboardRequested || operationKeyboardSessionActive
    val suppressSoftKeyboard = suppressSoftKeyboardOnFocus && !shouldShowSoftKeyboard
    val isOperationKeyboardEligible = suppressSoftKeyboardOnFocus && enabled

    DisposableEffect(operationKeyboardController, isOperationKeyboardEligible) {
        if (!isOperationKeyboardEligible) {
            operationKeyboardController?.unregisterField(fieldFocusRequester)
            operationKeyboardSessionActive = false
        }
        onDispose {
            operationKeyboardController?.unregisterField(fieldFocusRequester)
            operationKeyboardSessionActive = false
        }
    }

    LaunchedEffect(shouldShowSoftKeyboard, softKeyboardRequestKey, isFocused, enabled) {
        if (shouldShowSoftKeyboard && enabled && isFocused) {
            awaitFrame()
            keyboardController?.show()
            if (operationKeyboardRequested) {
                operationKeyboardController?.consumeKeyboardRequest(fieldFocusRequester)
            }
        }
    }

    LaunchedEffect(operationKeyboardRequested, enabled, isFocused) {
        if (operationKeyboardRequested && enabled && !isFocused) {
            fieldFocusRequester.requestFocusSafely()
        }
    }

    LaunchedEffect(showSoftKeyboard, enabled) {
        if (!enabled || !showSoftKeyboard) {
            operationKeyboardSessionActive = false
        }
    }

    LaunchedEffect(value) {
        if (value != textFieldValue.text) {
            textFieldValue = TextFieldValue(
                text = value,
                selection = if (selectAllOnFocus && isFocused && value.isNotEmpty()) {
                    TextRange(0, value.length)
                } else {
                    TextRange(value.length)
                }
            )
        }
    }

    LaunchedEffect(selectAllRequestKey, enabled, isFocused) {
        if (
            enabled &&
            isFocused &&
            textFieldValue.text.isNotEmpty() &&
            selectAllRequestKey != null &&
            selectAllRequestKey != handledSelectAllRequestKey
        ) {
            awaitFrame()
            textFieldValue = textFieldValue.copy(
                selection = TextRange(0, textFieldValue.text.length)
            )
            handledSelectAllRequestKey = selectAllRequestKey
        }
    }

    fun normalizeManualInput(currentText: String): String {
        return currentText.replace("\r", "").replace("\n", "")
    }

    fun handleScannerLikeSubmit(currentText: String): Boolean {
        val cleaned = currentText.trim()
        if (cleaned != textFieldValue.text) {
            textFieldValue = TextFieldValue(
                text = cleaned,
                selection = if (selectAllAfterSubmit && cleaned.isNotEmpty()) {
                    TextRange(0, cleaned.length)
                } else {
                    TextRange(cleaned.length)
                }
            )
        }
        onValueChange(cleaned)

        if (submitOnLineBreak) {
            if (cleaned.isNotBlank()) {
                onLineBreakSubmit?.invoke(cleaned)
            } else {
                onImeAction()
            }
        } else {
            onImeAction()
        }
        return true
    }

    val textFieldContent: @Composable () -> Unit = {
        OutlinedTextField(
            value = textFieldValue,
            onValueChange = { newValue ->
                if (submitOnLineBreak && (newValue.text.contains("\n") || newValue.text.contains("\r"))) {
                    if (shouldShowSoftKeyboard) {
                        val manualText = normalizeManualInput(newValue.text)
                        textFieldValue = TextFieldValue(
                            text = manualText,
                            selection = TextRange(manualText.length)
                        )
                        onValueChange(manualText)
                        return@OutlinedTextField
                    }

                    val cleaned = newValue.text.trim()
                    textFieldValue = TextFieldValue(
                        text = cleaned,
                        selection = if (selectAllAfterSubmit && cleaned.isNotEmpty()) {
                            TextRange(0, cleaned.length)
                        } else {
                            TextRange(cleaned.length)
                        }
                    )
                    onValueChange(cleaned)
                    if (cleaned.isNotBlank()) {
                        onLineBreakSubmit?.invoke(cleaned)
                    }
                } else {
                    textFieldValue = newValue
                    onValueChange(newValue.text)
                }
            },
            label = { Text(label) },
            placeholder = placeholder?.let { placeholderText ->
                {
                    Text(placeholderText)
                }
            },
            modifier = modifier
                .fillMaxWidth()
                .heightIn(min = height)
                .focusRequester(fieldFocusRequester)
                .onFocusChanged { focusState ->
                    val focused = focusState.isFocused
                    isFocused = focused
                    if (focused && selectAllOnFocus && textFieldValue.text.isNotEmpty()) {
                        textFieldValue = textFieldValue.copy(
                            selection = TextRange(0, textFieldValue.text.length)
                        )
                    }
                    if (focused && isOperationKeyboardEligible) {
                        operationKeyboardController?.onEligibleFieldFocused(fieldFocusRequester)
                    }
                    if (operationKeyboardRequested && focused) {
                        operationKeyboardSessionActive = true
                    }
                    if (!focused) {
                        operationKeyboardSessionActive = false
                    }
                    onFocusChanged?.invoke(focused)
                }
                .onPreviewKeyEvent { keyEvent ->
                    if (
                        enabled &&
                        keyEvent.type == KeyEventType.KeyUp &&
                        (keyEvent.key == Key.Enter || keyEvent.key == Key.NumPadEnter) &&
                        !shouldShowSoftKeyboard
                    ) {
                        handleScannerLikeSubmit(textFieldValue.text)
                    } else {
                        false
                    }
                }
                .suppressSoftKeyboardOnFocus(suppressSoftKeyboard),
            textStyle = TextStyle(fontSize = 18.sp),
            singleLine = singleLine,
            enabled = enabled,
            visualTransformation = when {
                isPassword && !passwordVisible -> PasswordVisualTransformation()
                else -> VisualTransformation.None
            },
            keyboardOptions = KeyboardOptions(
                keyboardType = if (isPassword) KeyboardType.Password else keyboardType,
                imeAction = imeAction
            ),
            keyboardActions = KeyboardActions(
                onNext = { onImeAction() },
                onDone = {
                    onImeAction()
                    keyboardController?.hide()
                },
                onGo = {
                    onImeAction()
                    keyboardController?.hide()
                }
            ),
            trailingIcon = if ((showClearButton && value.isNotEmpty() && enabled) || isPassword) {
                {
                    Row {
                        if (showClearButton && value.isNotEmpty() && enabled) {
                            IconButton(
                                onClick = {
                                    textFieldValue = TextFieldValue("")
                                    onValueChange("")
                                    onClear?.invoke()
                                    if (refocusOnClear) {
                                        runCatching { fieldFocusRequester.requestFocus() }
                                    }
                                },
                                modifier = Modifier.height(36.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.Backspace,
                                    contentDescription = stringResource(R.string.common_clear_input),
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f)
                                )
                            }
                        }

                        if (isPassword) {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) {
                                        Icons.Filled.VisibilityOff
                                    } else {
                                        Icons.Filled.Visibility
                                    },
                                    contentDescription = if (passwordVisible) {
                                        stringResource(R.string.common_hide_password)
                                    } else {
                                        stringResource(R.string.common_show_password)
                                    }
                                )
                            }
                        }
                    }
                }
            } else null
        )
    }

    textFieldContent()
}
