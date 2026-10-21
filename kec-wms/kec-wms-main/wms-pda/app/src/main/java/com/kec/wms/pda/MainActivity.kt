package com.kec.wms.pda

import android.os.Bundle
import android.os.SystemClock
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.kec.wms.pda.R
import com.kec.wms.pda.presentation.login.LoginScreen
import com.kec.wms.pda.presentation.login.WarehouseSelectionScreen
import com.kec.wms.pda.presentation.theme.WmsPdaTheme
import com.kec.wms.pda.presentation.common.PdaUiEvent
import com.kec.wms.pda.navigation.PdaAppContext
import com.kec.wms.pda.navigation.PdaRoutes
import com.kec.wms.pda.navigation.PdaScreenSpec
import com.kec.wms.pda.presentation.update.AppUpdateDialog
import com.kec.wms.pda.sound.PdaHapticManager
import com.kec.wms.pda.sound.PdaSoundManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject
    lateinit var pdaSoundManager: PdaSoundManager
    @Inject
    lateinit var pdaHapticManager: PdaHapticManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val viewModel: MainViewModel = hiltViewModel()
            val themeId by viewModel.themeId.collectAsState(initial = "kerry_orange")

            WmsPdaTheme(themeId = themeId) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WmsPdaApp(
                        soundManager = pdaSoundManager,
                        hapticManager = pdaHapticManager,
                        viewModel = viewModel
                    )
                }
            }
        }
    }
}

@Composable
fun WmsPdaApp(
    soundManager: PdaSoundManager,
    hapticManager: PdaHapticManager,
    viewModel: MainViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val restoredSession = remember { viewModel.checkLoginStatus() }
    val appUpdateUiState by viewModel.appUpdateUiState.collectAsState()

    var isLoggedIn by remember { mutableStateOf(restoredSession.isLoggedIn) }
    var currentScreen by remember { mutableStateOf(PdaRoutes.HOME) }
    var pendingReceivingAsnNumber by remember { mutableStateOf<String?>(null) }
    var currentUser by remember { mutableStateOf(restoredSession.currentUser) }
    var currentTenantCode by remember { mutableStateOf(restoredSession.tenantCode) }
    var currentUsername by remember { mutableStateOf(restoredSession.username) }
    var currentWarehouseId by remember { mutableStateOf(restoredSession.warehouseId) }
    var lastHomeBackPressedAt by remember { mutableStateOf(0L) }

    fun resetSessionState() {
        isLoggedIn = false
        currentScreen = PdaRoutes.HOME
        pendingReceivingAsnNumber = null
        currentUser = null
        currentTenantCode = ""
        currentUsername = ""
        currentWarehouseId = ""
    }

    LaunchedEffect(Unit) {
        viewModel.checkForAppUpdate()
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.resumeAppUpdateInstallIfReady()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    LaunchedEffect(Unit) {
        viewModel.sessionExpiredEvents.collect {
            resetSessionState()
            Toast.makeText(
                context,
                context.getString(R.string.login_session_expired),
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    val appContext = PdaAppContext(
        currentUser = currentUser,
        currentTenantCode = currentTenantCode,
        currentUsername = currentUsername,
        pendingReceivingAsnNumber = pendingReceivingAsnNumber,
        appUpdateUiState = appUpdateUiState,
        navigateTo = { screen ->
            if (screen == PdaRoutes.ASN_SCAN) {
                pendingReceivingAsnNumber = null
            }
            currentScreen = screen
        },
        goHome = {
            pendingReceivingAsnNumber = null
            currentScreen = PdaRoutes.HOME
        },
        logout = {
            viewModel.logout()
            resetSessionState()
        },
        checkForAppUpdate = viewModel::checkForAppUpdate,
        onUiEvent = { event ->
            handleUiEvent(soundManager, hapticManager, event)
        }
    )

    BackHandler(enabled = isLoggedIn && currentScreen == PdaRoutes.HOME) {
        val now = SystemClock.elapsedRealtime()
        if (now - lastHomeBackPressedAt <= 2000L) {
            (context as? ComponentActivity)?.finish()
        } else {
            lastHomeBackPressedAt = now
            Toast.makeText(
                context,
                context.getString(R.string.common_press_back_again_exit),
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    if (isLoggedIn) {
        if (currentWarehouseId.isBlank()) {
            WarehouseSelectionScreen(
                currentUser = currentUser,
                onWarehouseSelected = { warehouseId ->
                    currentWarehouseId = warehouseId
                    currentScreen = PdaRoutes.HOME
                },
                onLogout = {
                    appContext.logout()
                }
            )
        } else {
            PdaScreenSpec.fromRoute(currentScreen).Render(appContext)
        }
    } else {
        LoginScreen(
            onLoginSuccess = { user, tenantCode, username ->
                val restoredSessionAfterLogin = viewModel.checkLoginStatus()
                currentUser = user
                currentTenantCode = tenantCode
                currentUsername = username
                currentWarehouseId = restoredSessionAfterLogin.warehouseId
                isLoggedIn = true
            }
        )
    }

    val updateInfo = appUpdateUiState.updateInfo
    if (updateInfo != null &&
        (appUpdateUiState.showPrompt ||
            appUpdateUiState.isDownloading ||
            appUpdateUiState.requiresInstallPermission)
    ) {
        AppUpdateDialog(
            updateInfo = updateInfo,
            isForceUpdate = appUpdateUiState.isForceUpdate,
            isDownloading = appUpdateUiState.isDownloading,
            downloadProgressPercent = appUpdateUiState.downloadProgressPercent,
            requiresInstallPermission = appUpdateUiState.requiresInstallPermission,
            statusMessage = appUpdateUiState.statusMessage,
            errorMessage = appUpdateUiState.errorMessage,
            onConfirm = {
                if (appUpdateUiState.requiresInstallPermission) {
                    viewModel.openInstallPermissionSettings()
                } else {
                    viewModel.startAppUpdate()
                }
            },
            onDismiss = viewModel::dismissAppUpdatePrompt,
            onExitApp = {
                (context as? ComponentActivity)?.finish()
            }
        )
    }
}

private fun handleUiEvent(
    soundManager: PdaSoundManager,
    hapticManager: PdaHapticManager,
    event: PdaUiEvent
) {
    when (event) {
        is PdaUiEvent.PlaySound -> {
            soundManager.play(event.event)
            hapticManager.vibrate(event.event)
        }
    }
}
