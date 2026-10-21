package com.kec.wms.pda

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.data.auth.AuthSessionEvent
import com.kec.wms.pda.data.auth.AuthSessionManager
import com.kec.wms.pda.data.local.LoginPreferences
import com.kec.wms.pda.data.local.SavedUserInfo
import com.kec.wms.pda.data.model.AppUpdateEvaluation
import com.kec.wms.pda.data.model.AppUpdateInfo
import com.kec.wms.pda.data.model.AppUpdateRequirement
import com.kec.wms.pda.data.model.LoginUserInfo
import com.kec.wms.pda.data.repository.AuthRepository
import com.kec.wms.pda.domain.usecase.CheckAppUpdateUseCase
import com.kec.wms.pda.update.AppUpdateDownloadState
import com.kec.wms.pda.update.AppUpdateManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

data class RestoredSession(
    val isLoggedIn: Boolean,
    val currentUser: LoginUserInfo? = null,
    val tenantCode: String = "",
    val username: String = "",
    val warehouseId: String = ""
)

data class AppUpdateUiState(
    val currentVersionName: String = BuildConfig.VERSION_NAME,
    val currentVersionCode: Int = BuildConfig.VERSION_CODE,
    val latestVersionName: String? = null,
    val latestVersionCode: Int? = null,
    val releaseNotes: List<String> = emptyList(),
    val updateInfo: AppUpdateInfo? = null,
    val isChecking: Boolean = false,
    val isUpdateAvailable: Boolean = false,
    val isForceUpdate: Boolean = false,
    val showPrompt: Boolean = false,
    val isDownloading: Boolean = false,
    val downloadProgressPercent: Int? = null,
    val requiresInstallPermission: Boolean = false,
    val statusMessage: String? = null,
    val errorMessage: String? = null
)

@HiltViewModel
class MainViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val loginPreferences: LoginPreferences,
    private val authSessionManager: AuthSessionManager,
    private val checkAppUpdateUseCase: CheckAppUpdateUseCase,
    private val appUpdateManager: AppUpdateManager,
    @ApplicationContext private val context: Context
) : ViewModel() {

    val themeId: Flow<String> = loginPreferences.themeId

    private val _appUpdateUiState = MutableStateFlow(AppUpdateUiState())
    val appUpdateUiState: StateFlow<AppUpdateUiState> = _appUpdateUiState.asStateFlow()

    private val _sessionExpiredEvents = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val sessionExpiredEvents: SharedFlow<Unit> = _sessionExpiredEvents.asSharedFlow()

    init {
        observeAppUpdateDownloads()
        observeAuthSessionEvents()
    }

    fun checkLoginStatus(): RestoredSession {
        val isLoggedIn = authRepository.isLoggedIn()
        if (!isLoggedIn) {
            return RestoredSession(isLoggedIn = false)
        }

        val savedUserInfo = authRepository.getSavedUserInfo()
        val tenantCode = runBlocking { loginPreferences.tenantCode.first() }
        val username = runBlocking { loginPreferences.username.first() }
        val warehouseId = runBlocking { loginPreferences.warehouseId.first() }

        return RestoredSession(
            isLoggedIn = true,
            currentUser = savedUserInfo?.toLoginUserInfo(),
            tenantCode = tenantCode,
            username = username,
            warehouseId = warehouseId
        )
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
        }
    }

    private fun observeAuthSessionEvents() {
        viewModelScope.launch {
            authSessionManager.events.collect { event ->
                when (event) {
                    AuthSessionEvent.SessionExpired -> {
                        authRepository.logout()
                        _sessionExpiredEvents.emit(Unit)
                    }
                }
            }
        }
    }

    fun checkForAppUpdate(manual: Boolean = false) {
        if (_appUpdateUiState.value.isChecking) {
            return
        }

        viewModelScope.launch {
            if (manual) {
                _appUpdateUiState.update {
                    it.copy(
                        errorMessage = null,
                        statusMessage = null
                    )
                }
            }

            _appUpdateUiState.update { it.copy(isChecking = true) }

            checkAppUpdateUseCase()
                .onSuccess { info ->
                    val evaluation = evaluateUpdate(info)
                    val ignoredVersionCode = loginPreferences.getIgnoredUpdateVersionCodeSync()
                    val shouldShowPrompt = when (evaluation.requirement) {
                        AppUpdateRequirement.FORCED -> true
                        AppUpdateRequirement.OPTIONAL -> manual || ignoredVersionCode != info.versionCode
                        AppUpdateRequirement.NONE -> false
                    }

                    if (evaluation.requirement != AppUpdateRequirement.OPTIONAL ||
                        info.versionCode <= BuildConfig.VERSION_CODE
                    ) {
                        loginPreferences.saveIgnoredUpdateVersionCode(null)
                    }

                    _appUpdateUiState.update { current ->
                        current.copy(
                            latestVersionName = info.versionName,
                            latestVersionCode = info.versionCode,
                            releaseNotes = info.releaseNotes,
                            updateInfo = evaluation.info.takeIf {
                                evaluation.requirement != AppUpdateRequirement.NONE
                            },
                            isChecking = false,
                            isUpdateAvailable = evaluation.requirement != AppUpdateRequirement.NONE,
                            isForceUpdate = evaluation.requirement == AppUpdateRequirement.FORCED,
                            showPrompt = shouldShowPrompt,
                            statusMessage = when (evaluation.requirement) {
                                AppUpdateRequirement.NONE -> {
                                    if (manual) {
                                        context.getString(R.string.app_update_status_latest)
                                    } else {
                                        current.statusMessage
                                    }
                                }

                                AppUpdateRequirement.OPTIONAL -> {
                                    context.getString(
                                        R.string.app_update_status_available,
                                        info.versionName
                                    )
                                }

                                AppUpdateRequirement.FORCED -> {
                                    context.getString(
                                        R.string.app_update_status_required,
                                        info.versionName
                                    )
                                }
                            },
                            errorMessage = null
                        )
                    }
                }
                .onFailure { _ ->
                    _appUpdateUiState.update { current ->
                        current.copy(
                            isChecking = false,
                            statusMessage = current.statusMessage,
                            errorMessage = null
                        )
                    }
                }
        }
    }

    fun dismissAppUpdatePrompt() {
        val currentState = _appUpdateUiState.value
        if (currentState.isForceUpdate) {
            return
        }

        viewModelScope.launch {
            currentState.updateInfo?.let { info ->
                loginPreferences.saveIgnoredUpdateVersionCode(info.versionCode)
            }

            _appUpdateUiState.update { current ->
                current.copy(
                    showPrompt = false,
                    statusMessage = currentState.updateInfo?.let { info ->
                        context.getString(R.string.app_update_status_skipped, info.versionName)
                    } ?: current.statusMessage
                )
            }
        }
    }

    fun startAppUpdate() {
        val info = _appUpdateUiState.value.updateInfo ?: return
        _appUpdateUiState.update {
            it.copy(
                showPrompt = true,
                errorMessage = null
            )
        }
        appUpdateManager.startUpdate(info)
    }

    fun openInstallPermissionSettings() {
        appUpdateManager.openUnknownAppInstallSettings()
    }

    fun resumeAppUpdateInstallIfReady() {
        appUpdateManager.resumeInstallIfPermissionGranted()
    }

    private fun observeAppUpdateDownloads() {
        viewModelScope.launch {
            appUpdateManager.state.collect { state ->
                when (state) {
                    AppUpdateDownloadState.Idle -> {
                        _appUpdateUiState.update {
                            it.copy(
                                isDownloading = false,
                                downloadProgressPercent = null,
                                requiresInstallPermission = false
                            )
                        }
                    }

                    is AppUpdateDownloadState.Downloading -> {
                        _appUpdateUiState.update {
                            it.copy(
                                updateInfo = state.info,
                                isUpdateAvailable = true,
                                showPrompt = true,
                                isDownloading = true,
                                downloadProgressPercent = state.progressPercent,
                                requiresInstallPermission = false,
                                statusMessage = context.getString(
                                    R.string.app_update_status_downloading,
                                    state.info.versionName
                                ),
                                errorMessage = null
                            )
                        }
                    }

                    is AppUpdateDownloadState.InstallPermissionRequired -> {
                        _appUpdateUiState.update {
                            it.copy(
                                updateInfo = state.info,
                                isUpdateAvailable = true,
                                showPrompt = true,
                                isDownloading = false,
                                downloadProgressPercent = null,
                                requiresInstallPermission = true,
                                statusMessage = context.getString(R.string.app_update_permission_required),
                                errorMessage = null
                            )
                        }
                    }

                    is AppUpdateDownloadState.ReadyToInstall -> {
                        _appUpdateUiState.update {
                            it.copy(
                                updateInfo = state.info,
                                isUpdateAvailable = true,
                                showPrompt = true,
                                isDownloading = false,
                                downloadProgressPercent = null,
                                requiresInstallPermission = false,
                                statusMessage = if (state.installerOpened) {
                                    context.getString(R.string.app_update_status_installer_opened)
                                } else {
                                    it.statusMessage
                                },
                                errorMessage = null
                            )
                        }
                    }

                    is AppUpdateDownloadState.Error -> {
                        _appUpdateUiState.update {
                            it.copy(
                                updateInfo = state.info,
                                isUpdateAvailable = true,
                                showPrompt = true,
                                isDownloading = false,
                                downloadProgressPercent = null,
                                requiresInstallPermission = false,
                                statusMessage = null,
                                errorMessage = state.message
                            )
                        }
                    }
                }
            }
        }
    }

    private fun evaluateUpdate(info: AppUpdateInfo): AppUpdateEvaluation {
        val currentVersionCode = BuildConfig.VERSION_CODE
        val requirement = when {
            currentVersionCode < info.minSupportedVersionCode -> AppUpdateRequirement.FORCED
            currentVersionCode < info.versionCode && info.forceUpdate -> AppUpdateRequirement.FORCED
            currentVersionCode < info.versionCode -> AppUpdateRequirement.OPTIONAL
            else -> AppUpdateRequirement.NONE
        }

        return AppUpdateEvaluation(
            info = info,
            requirement = requirement
        )
    }
}

private fun SavedUserInfo.toLoginUserInfo(): LoginUserInfo {
    return LoginUserInfo(
        id = userId,
        username = username,
        fullName = fullName,
        email = email,
        tenantId = tenantId ?: "",
        tenantCode = tenantCode ?: "",
        tenantName = tenantName ?: "",
        userType = userType ?: "",
        passwordExpired = false
    )
}
