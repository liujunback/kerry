package com.kec.wms.pda.presentation.theme

import androidx.annotation.StringRes
import androidx.compose.ui.graphics.Color
import com.kec.wms.pda.R

data class PdaThemePreset(
    val id: String,
    @StringRes val nameRes: Int,
    val lightPrimary: Color,
    val lightPrimaryContainer: Color,
    val lightOnPrimaryContainer: Color,
    val darkPrimary: Color,
    val darkPrimaryContainer: Color,
    val darkOnPrimaryContainer: Color,
)

object PdaThemePresets {
    val all: List<PdaThemePreset> = listOf(
        PdaThemePreset("kerry_orange", R.string.theme_name_kerry_orange, Color(0xFFD86A1C), Color(0xFFFDE9DB), Color(0xFF4B2306), Color(0xFFF3B58A), Color(0xFF7B3910), Color(0xFFFDE9DC)),
        PdaThemePreset("mist_blue", R.string.theme_name_mist_blue, Color(0xFFB48A2E), Color(0xFFF7EEDB), Color(0xFF3A2B0A), Color(0xFFE3C16A), Color(0xFF5E4715), Color(0xFFF9EED6)),
        PdaThemePreset("arctic_blue", R.string.theme_name_arctic_blue, Color(0xFF2C4A3F), Color(0xFFE6F1ED), Color(0xFF112921), Color(0xFF9CC5B6), Color(0xFF2B433A), Color(0xFFE4F2ED)),
        PdaThemePreset("emerald_teal", R.string.theme_name_emerald_teal, Color(0xFF2F6594), Color(0xFFE5EFF8), Color(0xFF122A3F), Color(0xFFA8C6E1), Color(0xFF2C4D68), Color(0xFFE6F0FA)),
        PdaThemePreset("sage_green", R.string.theme_name_sage_green, Color(0xFF7A8796), Color(0xFFEBEFF3), Color(0xFF222E39), Color(0xFFC0CAD5), Color(0xFF485563), Color(0xFFEAF0F6)),
        PdaThemePreset("graphite", R.string.theme_name_graphite, Color(0xFF69707A), Color(0xFFEDEFF2), Color(0xFF252A31), Color(0xFFC0C5CC), Color(0xFF4D5560), Color(0xFFEEF1F4)),
        PdaThemePreset("coral_red", R.string.theme_name_coral_red, Color(0xFF64AFC3), Color(0xFFE5F4F8), Color(0xFF113644), Color(0xFFA8D7E4), Color(0xFF2B5C6A), Color(0xFFE6F5F9)),
        PdaThemePreset("iris_blue", R.string.theme_name_iris_blue, Color(0xFF8A5F7A), Color(0xFFF3E9EF), Color(0xFF311E2A), Color(0xFFD2BCC9), Color(0xFF5B3D50), Color(0xFFF4EAF0)),
    )

    fun byId(id: String?): PdaThemePreset {
        return all.firstOrNull { it.id == id } ?: all.first()
    }
}
