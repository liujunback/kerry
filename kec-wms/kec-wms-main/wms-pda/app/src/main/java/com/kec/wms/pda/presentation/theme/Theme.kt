package com.kec.wms.pda.presentation.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

/**
 * WMS PDA应用主题
 * 针对PDA设备优化的Material Design 3主题
 */
@Composable
fun WmsPdaTheme(
    themeId: String = "kerry_orange",
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val preset = PdaThemePresets.byId(themeId)
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = preset.darkPrimary,
            primaryContainer = preset.darkPrimaryContainer,
            onPrimary = DarkOnPrimary,
            onPrimaryContainer = preset.darkOnPrimaryContainer,
            secondary = DarkSecondary,
            secondaryContainer = DarkSecondaryContainer,
            onSecondary = DarkOnSecondary,
            onSecondaryContainer = DarkOnSecondaryContainer,
            tertiary = DarkTertiary,
            tertiaryContainer = DarkTertiaryContainer,
            onTertiary = DarkOnTertiary,
            onTertiaryContainer = DarkOnTertiaryContainer,
            background = DarkBackground,
            onBackground = DarkOnBackground,
            surface = DarkSurface,
            surfaceVariant = DarkSurfaceVariant,
            onSurface = DarkOnSurface,
            onSurfaceVariant = DarkOnSurfaceVariant,
            outline = DarkOutline,
            error = DarkError,
            errorContainer = DarkErrorContainer,
            onError = DarkOnError,
            onErrorContainer = DarkOnErrorContainer
        )
    } else {
        lightColorScheme(
            primary = preset.lightPrimary,
            primaryContainer = preset.lightPrimaryContainer,
            onPrimary = OnPrimary,
            onPrimaryContainer = preset.lightOnPrimaryContainer,
            secondary = Secondary,
            secondaryContainer = SecondaryContainer,
            onSecondary = OnSecondary,
            onSecondaryContainer = OnSecondaryContainer,
            tertiary = Tertiary,
            tertiaryContainer = TertiaryContainer,
            onTertiary = OnTertiary,
            onTertiaryContainer = OnTertiaryContainer,
            background = Background,
            onBackground = OnBackground,
            surface = Surface,
            surfaceVariant = SurfaceVariant,
            onSurface = OnSurface,
            onSurfaceVariant = OnSurfaceVariant,
            outline = Outline,
            error = Error,
            errorContainer = ErrorContainer,
            onError = OnError,
            onErrorContainer = OnErrorContainer
        )
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
