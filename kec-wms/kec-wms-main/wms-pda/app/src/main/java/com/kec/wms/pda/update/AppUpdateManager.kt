package com.kec.wms.pda.update

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.AppUpdateInfo
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject
import javax.inject.Singleton

sealed interface AppUpdateDownloadState {
    data object Idle : AppUpdateDownloadState

    data class Downloading(
        val info: AppUpdateInfo,
        val progressPercent: Int?
    ) : AppUpdateDownloadState

    data class InstallPermissionRequired(
        val info: AppUpdateInfo
    ) : AppUpdateDownloadState

    data class ReadyToInstall(
        val info: AppUpdateInfo,
        val installerOpened: Boolean
    ) : AppUpdateDownloadState

    data class Error(
        val info: AppUpdateInfo,
        val message: String
    ) : AppUpdateDownloadState
}

@Singleton
class AppUpdateManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val downloadManager =
        context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
    private val receiverRegistered = AtomicBoolean(false)
    private val apkFileName = "kec-wms-pda-update.apk"
    private val authority = "${context.packageName}.fileprovider"
    private val mainHandler = Handler(Looper.getMainLooper())

    private var activeDownloadId: Long? = null
    private var activeInfo: AppUpdateInfo? = null
    private var progressJob: Job? = null

    private val _state = MutableStateFlow<AppUpdateDownloadState>(AppUpdateDownloadState.Idle)
    val state: StateFlow<AppUpdateDownloadState> = _state.asStateFlow()

    private val downloadCompleteReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action != DownloadManager.ACTION_DOWNLOAD_COMPLETE) {
                return
            }

            val downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L)
            val activeId = activeDownloadId ?: return
            if (downloadId != activeId) {
                return
            }

            val info = activeInfo ?: return
            appScope.launch {
                handleDownloadCompleted(downloadId, info)
            }
        }
    }

    init {
        registerReceiverIfNeeded()
    }

    fun startUpdate(info: AppUpdateInfo) {
        appScope.launch {
            activeInfo = info
            val apkFile = getApkFile()

            if (apkFile.exists() && verifySha256(apkFile, info.fileSha256)) {
                openInstallerIfPossible(info, apkFile)
                return@launch
            }

            apkFile.delete()
            enqueueDownload(info)
        }
    }

    fun resumeInstallIfPermissionGranted() {
        appScope.launch {
            val permissionState = _state.value as? AppUpdateDownloadState.InstallPermissionRequired ?: return@launch
            val info = activeInfo ?: permissionState.info
            val apkFile = getApkFile()

            if (!apkFile.exists()) {
                return@launch
            }

            if (!verifySha256(apkFile, info.fileSha256)) {
                apkFile.delete()
                _state.value = AppUpdateDownloadState.Error(
                    info,
                    context.getString(R.string.app_update_error_verify_failed)
                )
                return@launch
            }

            openInstallerIfPossible(info, apkFile)
        }
    }

    fun openUnknownAppInstallSettings() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
            data = Uri.parse("package:${context.packageName}")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        mainHandler.post {
            context.startActivity(intent)
        }
    }

    private fun registerReceiverIfNeeded() {
        if (!receiverRegistered.compareAndSet(false, true)) {
            return
        }

        ContextCompat.registerReceiver(
            context,
            downloadCompleteReceiver,
            IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    private fun enqueueDownload(info: AppUpdateInfo) {
        val request = DownloadManager.Request(Uri.parse(info.downloadUrl))
            .setMimeType("application/vnd.android.package-archive")
            .setTitle(context.getString(R.string.app_update_download_title))
            .setDescription(context.getString(R.string.app_update_download_description))
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)
            .setVisibleInDownloadsUi(true)
            .setDestinationInExternalFilesDir(
                context,
                Environment.DIRECTORY_DOWNLOADS,
                apkFileName
            )

        activeDownloadId = downloadManager.enqueue(request)
        _state.value = AppUpdateDownloadState.Downloading(info, null)
        startProgressPolling(activeDownloadId!!, info)
    }

    private fun startProgressPolling(downloadId: Long, info: AppUpdateInfo) {
        progressJob?.cancel()
        progressJob = appScope.launch {
            while (true) {
                val status = queryDownloadStatus(downloadId) ?: break
                if (status.isTerminal) {
                    break
                }
                _state.value = AppUpdateDownloadState.Downloading(info, status.progressPercent)
                delay(700)
            }
        }
    }

    private suspend fun handleDownloadCompleted(downloadId: Long, info: AppUpdateInfo) {
        progressJob?.cancel()
        val status = queryDownloadStatus(downloadId)

        if (status == null || status.status == DownloadManager.STATUS_FAILED) {
            _state.value = AppUpdateDownloadState.Error(
                info,
                context.getString(R.string.app_update_error_download_failed)
            )
            return
        }

        val apkFile = getApkFile()
        if (!apkFile.exists()) {
            _state.value = AppUpdateDownloadState.Error(
                info,
                context.getString(R.string.app_update_error_file_missing)
            )
            return
        }

        if (!verifySha256(apkFile, info.fileSha256)) {
            apkFile.delete()
            _state.value = AppUpdateDownloadState.Error(
                info,
                context.getString(R.string.app_update_error_verify_failed)
            )
            return
        }

        openInstallerIfPossible(info, apkFile)
    }

    private fun openInstallerIfPossible(info: AppUpdateInfo, apkFile: File) {
        if (requiresInstallPermission()) {
            _state.value = AppUpdateDownloadState.InstallPermissionRequired(info)
            return
        }

        val apkUri = FileProvider.getUriForFile(context, authority, apkFile)
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        mainHandler.post {
            context.startActivity(installIntent)
        }
        _state.value = AppUpdateDownloadState.ReadyToInstall(
            info = info,
            installerOpened = true
        )
    }

    private fun requiresInstallPermission(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            !context.packageManager.canRequestPackageInstalls()
    }

    private fun queryDownloadStatus(downloadId: Long): DownloadStatus? {
        val query = DownloadManager.Query().setFilterById(downloadId)
        downloadManager.query(query)?.use { cursor ->
            if (!cursor.moveToFirst()) {
                return null
            }

            val status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            val bytesSoFar =
                cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val totalBytes =
                cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            val progressPercent = if (totalBytes > 0L) {
                ((bytesSoFar * 100) / totalBytes).toInt()
            } else {
                null
            }

            return DownloadStatus(
                status = status,
                progressPercent = progressPercent
            )
        }
        return null
    }

    private fun verifySha256(file: File, expectedSha256: String): Boolean {
        if (!file.exists()) {
            return false
        }

        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { input ->
            val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
            while (true) {
                val read = input.read(buffer)
                if (read <= 0) {
                    break
                }
                digest.update(buffer, 0, read)
            }
        }

        val actualSha256 = digest.digest().joinToString("") { byte ->
            String.format(Locale.US, "%02x", byte)
        }

        return actualSha256.equals(expectedSha256, ignoreCase = true)
    }

    private fun getApkFile(): File {
        val downloadsDir = requireNotNull(
            context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)
        ) {
            "无法访问应用下载目录"
        }
        return File(downloadsDir, apkFileName)
    }

    private data class DownloadStatus(
        val status: Int,
        val progressPercent: Int?
    ) {
        val isTerminal: Boolean
            get() = status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED
    }
}
