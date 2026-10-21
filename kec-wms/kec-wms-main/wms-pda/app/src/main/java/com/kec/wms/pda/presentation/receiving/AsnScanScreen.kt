package com.kec.wms.pda.presentation.receiving

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.kec.wms.pda.R
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaTopBar

@Composable
fun AsnScanScreen(
    onOpenSkuReceiving: () -> Unit,
    onOpenContainerReceiving: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            PdaTopBar(
                title = stringResource(R.string.receiving_mode_title),
                onBack = onBack
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(horizontal = 22.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(36.dp))

            ReceivingEntryButton(
                text = stringResource(R.string.receiving_mode_sku),
                onClick = onOpenSkuReceiving,
            )

            Spacer(modifier = Modifier.height(36.dp))

            ReceivingEntryButton(
                text = stringResource(R.string.receiving_mode_container),
                onClick = onOpenContainerReceiving,
            )
        }
    }
}

@Composable
private fun ReceivingEntryButton(
    text: String,
    onClick: () -> Unit
) {
    PdaButton(
        text = text,
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 22.dp)
    )
}
