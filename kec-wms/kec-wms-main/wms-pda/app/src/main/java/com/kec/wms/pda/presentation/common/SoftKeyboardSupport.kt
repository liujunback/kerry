package com.kec.wms.pda.presentation.common

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import kotlinx.coroutines.android.awaitFrame

@Composable
fun Modifier.suppressSoftKeyboardOnFocus(enabled: Boolean = true): Modifier = composed {
    val keyboardController = LocalSoftwareKeyboardController.current
    var isFocused by remember { mutableStateOf(false) }

    LaunchedEffect(enabled, isFocused) {
        if (enabled && isFocused) {
            keyboardController?.hide()
            awaitFrame()
            keyboardController?.hide()
        }
    }

    if (!enabled) {
        this
    } else {
        this.onFocusChanged { focusState ->
            isFocused = focusState.isFocused
        }
    }
}
