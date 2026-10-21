package com.kec.wms.pda.presentation.common

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kec.wms.pda.R

@Composable
fun PdaTopBar(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    trailingContent: (@Composable RowScope.() -> Unit)? = null
) {
    val operationKeyboardController = LocalOperationKeyboardController.current
    val showKeyboardAction = operationKeyboardController?.canOpenKeyboard == true

    Surface(
        color = MaterialTheme.colorScheme.primary,
        shadowElevation = 4.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .height(PdaTopBarDefaults.Height)
                .padding(horizontal = PdaTopBarDefaults.HorizontalPadding),
            contentAlignment = Alignment.Center
        ) {
            if (onBack != null) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier.align(Alignment.CenterStart)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = stringResource(R.string.common_back),
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }

            Text(
                text = title,
                color = MaterialTheme.colorScheme.onPrimary,
                fontSize = PdaTopBarDefaults.TitleFontSize,
                fontWeight = FontWeight.Bold
            )

            if (showKeyboardAction || trailingContent != null) {
                androidx.compose.foundation.layout.Row(
                    modifier = Modifier.align(Alignment.CenterEnd),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (showKeyboardAction && operationKeyboardController != null) {
                        PdaTopBarKeyboardAction(
                            enabled = operationKeyboardController.canOpenKeyboard,
                            onClick = operationKeyboardController::requestKeyboardForActiveField
                        )
                    }
                    trailingContent?.invoke(this)
                }
            }
        }
    }
}

@Composable
fun RowScope.PdaTopBarKeyboardAction(
    enabled: Boolean,
    onClick: () -> Unit
) {
    IconButton(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.focusProperties { canFocus = false }
    ) {
        Icon(
            imageVector = Icons.Filled.Keyboard,
            contentDescription = stringResource(R.string.common_open_soft_keyboard),
            tint = MaterialTheme.colorScheme.onPrimary.copy(
                alpha = if (enabled) 1f else 0.45f
            )
        )
    }
}
