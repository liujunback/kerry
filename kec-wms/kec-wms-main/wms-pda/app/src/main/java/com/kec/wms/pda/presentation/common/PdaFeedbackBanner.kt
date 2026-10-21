package com.kec.wms.pda.presentation.common

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

enum class PdaFeedbackTone {
    Success,
    Error,
    Info,
}

@Composable
fun PdaFeedbackBanner(
    message: String,
    modifier: Modifier = Modifier,
    title: String? = null,
    tone: PdaFeedbackTone = PdaFeedbackTone.Info,
) {
    val containerColor = when (tone) {
        PdaFeedbackTone.Success -> Color(0xFFE8FFD0)
        PdaFeedbackTone.Error -> Color(0xFFFFE4E4)
        PdaFeedbackTone.Info -> MaterialTheme.colorScheme.surfaceVariant
    }

    val contentColor = when (tone) {
        PdaFeedbackTone.Success -> Color(0xFF3D6B00)
        PdaFeedbackTone.Error -> Color(0xFFB01F1F)
        PdaFeedbackTone.Info -> MaterialTheme.colorScheme.onSurfaceVariant
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = containerColor)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            title?.let {
                Text(
                    text = it,
                    fontWeight = FontWeight.Bold,
                    color = contentColor
                )
                Spacer(modifier = Modifier.height(4.dp))
            }

            Text(
                text = message,
                color = contentColor
            )
        }
    }
}
