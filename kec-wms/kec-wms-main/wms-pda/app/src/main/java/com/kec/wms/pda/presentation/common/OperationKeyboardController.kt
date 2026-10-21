package com.kec.wms.pda.presentation.common

import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.focus.FocusRequester

class OperationKeyboardController {
    private var activeFieldRequester by mutableStateOf<FocusRequester?>(null)
    private var keyboardRequestTarget by mutableStateOf<FocusRequester?>(null)

    val canOpenKeyboard: Boolean
        get() = activeFieldRequester != null

    fun onEligibleFieldFocused(requester: FocusRequester) {
        activeFieldRequester = requester
    }

    fun unregisterField(requester: FocusRequester) {
        if (activeFieldRequester === requester) {
            activeFieldRequester = null
        }
        if (keyboardRequestTarget === requester) {
            keyboardRequestTarget = null
        }
    }

    fun requestKeyboardForActiveField() {
        keyboardRequestTarget = activeFieldRequester
    }

    fun isKeyboardRequestedFor(requester: FocusRequester): Boolean {
        return keyboardRequestTarget === requester
    }

    fun consumeKeyboardRequest(requester: FocusRequester) {
        if (keyboardRequestTarget === requester) {
            keyboardRequestTarget = null
        }
    }
}

val LocalOperationKeyboardController = compositionLocalOf<OperationKeyboardController?> { null }
