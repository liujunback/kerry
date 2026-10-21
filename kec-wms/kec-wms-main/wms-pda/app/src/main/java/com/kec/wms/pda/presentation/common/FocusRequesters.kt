package com.kec.wms.pda.presentation.common

import androidx.compose.ui.focus.FocusRequester
import kotlinx.coroutines.android.awaitFrame

suspend fun FocusRequester.requestFocusSafely() {
    awaitFrame()
    runCatching { requestFocus() }
}
