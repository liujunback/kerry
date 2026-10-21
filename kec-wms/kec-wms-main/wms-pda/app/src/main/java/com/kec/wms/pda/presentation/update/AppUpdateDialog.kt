package com.kec.wms.pda.presentation.update

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.AppUpdateInfo
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant

@Composable
fun AppUpdateDialog(
    updateInfo: AppUpdateInfo,
    isForceUpdate: Boolean,
    isDownloading: Boolean,
    downloadProgressPercent: Int?,
    requiresInstallPermission: Boolean,
    statusMessage: String?,
    errorMessage: String?,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    onExitApp: () -> Unit
) {
    AlertDialog(
        onDismissRequest = {
            if (!isForceUpdate && !isDownloading) {
                onDismiss()
            }
        },
        title = {
            Text(
                text = if (isForceUpdate) {
                    stringResource(R.string.app_update_force_title)
                } else {
                    stringResource(R.string.app_update_title)
                },
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = stringResource(
                        R.string.app_update_version_summary,
                        updateInfo.versionName
                    ),
                    style = MaterialTheme.typography.bodyMedium
                )

                statusMessage?.let { message ->
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (errorMessage != null) {
                            MaterialTheme.colorScheme.error
                        } else {
                            MaterialTheme.colorScheme.primary
                        }
                    )
                }

                errorMessage?.let { message ->
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.error
                    )
                }

                if (isDownloading && downloadProgressPercent != null) {
                    Text(
                        text = stringResource(
                            R.string.app_update_download_progress,
                            downloadProgressPercent
                        ),
                        style = MaterialTheme.typography.bodyMedium
                    )
                }

                if (updateInfo.releaseNotes.isNotEmpty()) {
                    Text(
                        text = stringResource(R.string.app_update_release_notes_title),
                        fontWeight = FontWeight.SemiBold
                    )
                    updateInfo.releaseNotes.forEach { note ->
                        Text(
                            text = "- $note",
                            modifier = Modifier.padding(start = 4.dp),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        },
        confirmButton = {
            PdaButton(
                text = when {
                    requiresInstallPermission -> stringResource(R.string.app_update_open_settings)
                    isDownloading -> stringResource(R.string.app_update_downloading)
                    else -> stringResource(R.string.app_update_action_now)
                },
                onClick = onConfirm,
                enabled = !isDownloading || requiresInstallPermission,
                fillMaxWidth = false
            )
        },
        dismissButton = {
            if (isForceUpdate) {
                PdaButton(
                    text = stringResource(R.string.app_update_action_exit),
                    onClick = onExitApp,
                    variant = PdaButtonVariant.Secondary,
                    fillMaxWidth = false
                )
            } else if (!isDownloading) {
                PdaButton(
                    text = stringResource(R.string.app_update_action_later),
                    onClick = onDismiss,
                    variant = PdaButtonVariant.Secondary,
                    fillMaxWidth = false
                )
            }
        }
    )
}
