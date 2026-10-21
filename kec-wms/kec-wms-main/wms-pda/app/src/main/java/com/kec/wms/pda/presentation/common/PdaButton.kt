package com.kec.wms.pda.presentation.common

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val PdaButtonShape = RoundedCornerShape(16.dp)
private val PdaMenuButtonShape = RoundedCornerShape(24.dp)

enum class PdaButtonVariant {
    Primary,
    Secondary,
    Text
}

@Composable
fun PdaButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    height: Dp = 56.dp,
    isLoading: Boolean = false,
    variant: PdaButtonVariant = PdaButtonVariant.Primary,
    fillMaxWidth: Boolean = true,
    fontSize: androidx.compose.ui.unit.TextUnit = 18.sp,
    fontWeight: FontWeight = FontWeight.Medium,
    leadingIcon: ImageVector? = null,
    contentColor: Color? = null,
) {
    val actualModifier = if (fillMaxWidth) {
        modifier.fillMaxWidth().height(height)
    } else {
        modifier.height(height)
    }
    val resolvedContentColor = contentColor ?: when (variant) {
        PdaButtonVariant.Primary -> MaterialTheme.colorScheme.onPrimary
        PdaButtonVariant.Secondary -> MaterialTheme.colorScheme.primary
        PdaButtonVariant.Text -> MaterialTheme.colorScheme.primary
    }
    val colors = when (variant) {
        PdaButtonVariant.Primary -> ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = resolvedContentColor,
            disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.45f),
            disabledContentColor = resolvedContentColor.copy(alpha = 0.75f)
        )

        PdaButtonVariant.Secondary -> ButtonDefaults.outlinedButtonColors(
            contentColor = resolvedContentColor,
            disabledContentColor = resolvedContentColor.copy(alpha = 0.55f)
        )

        PdaButtonVariant.Text -> ButtonDefaults.textButtonColors(
            contentColor = resolvedContentColor,
            disabledContentColor = resolvedContentColor.copy(alpha = 0.55f)
        )
    }

    Button(
        onClick = onClick,
        modifier = actualModifier,
        enabled = enabled,
        shape = if (variant == PdaButtonVariant.Text) RoundedCornerShape(12.dp) else PdaButtonShape,
        border = if (variant == PdaButtonVariant.Secondary) {
            BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.55f))
        } else {
            null
        },
        colors = colors,
        elevation = if (variant == PdaButtonVariant.Primary) {
            ButtonDefaults.buttonElevation(
                defaultElevation = 2.dp,
                pressedElevation = 4.dp
            )
        } else {
            null
        },
        contentPadding = if (variant == PdaButtonVariant.Text) {
            ButtonDefaults.TextButtonContentPadding
        } else {
            ButtonDefaults.ContentPadding
        }
    ) {
        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = resolvedContentColor
                )
            } else if (leadingIcon != null) {
                Icon(
                    imageVector = leadingIcon,
                    contentDescription = null,
                    tint = resolvedContentColor,
                    modifier = Modifier.size(18.dp)
                )
            }

            if (isLoading || leadingIcon != null) {
                androidx.compose.foundation.layout.Spacer(modifier = Modifier.size(8.dp))
            }

            Text(
                text = text,
                fontSize = fontSize,
                fontWeight = fontWeight
            )
        }
    }
}

@Composable
fun PdaBottomActionBar(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 2.dp,
        shadowElevation = 4.dp,
        modifier = modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            content = content
        )
    }
}

@Composable
fun PdaSelectionButton(
    text: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selectedContainerColor: Color,
    selectedContentColor: Color,
    height: Dp = 44.dp,
) {
    val containerColor = if (selected) {
        selectedContainerColor
    } else {
        MaterialTheme.colorScheme.surfaceVariant
    }
    val resolvedContentColor = if (selected) {
        selectedContentColor
    } else {
        MaterialTheme.colorScheme.onSurfaceVariant
    }

    Button(
        onClick = onClick,
        modifier = modifier.height(height),
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = resolvedContentColor
        ),
        shape = RoundedCornerShape(14.dp),
        elevation = null
    ) {
        Text(
            text = text,
            fontSize = 14.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal
        )
    }
}

@Composable
fun PdaMenuButton(
    text: String,
    icon: ImageVector,
    isPrimary: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    height: Dp = 72.dp,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val containerColor = if (isPrimary) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface
    val contentColor = if (isPrimary) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(height)
            .clip(PdaMenuButtonShape)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick,
            ),
        color = containerColor,
        shape = PdaMenuButtonShape,
        shadowElevation = if (isPrimary) 3.dp else 0.dp,
        border = if (isPrimary) {
            null
        } else {
            BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary)
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = contentColor,
                modifier = Modifier.size(24.dp),
            )
            Text(
                text = text,
                color = contentColor,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
    }
}

@Composable
fun PdaBottomBarPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    height: Dp = 48.dp,
) {
    PdaButton(
        text = text,
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        isLoading = isLoading,
        height = height,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold
    )
}

@Composable
fun PdaBottomBarSecondaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    height: Dp = 48.dp,
) {
    PdaButton(
        text = text,
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
        isLoading = isLoading,
        height = height,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        variant = PdaButtonVariant.Secondary
    )
}
