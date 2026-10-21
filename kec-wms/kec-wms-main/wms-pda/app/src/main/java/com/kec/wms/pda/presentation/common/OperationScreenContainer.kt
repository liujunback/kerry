package com.kec.wms.pda.presentation.common

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier

@Composable
fun OperationScreenContainer(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit
) {
    val keyboardController = remember { OperationKeyboardController() }

    Box(
        modifier = modifier.fillMaxSize()
    ) {
        CompositionLocalProvider(LocalOperationKeyboardController provides keyboardController) {
            content()
        }
    }
}
