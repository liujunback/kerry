package com.kec.wms.pda.navigation

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import com.kec.wms.pda.AppUpdateUiState
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.LoginUserInfo
import com.kec.wms.pda.presentation.checkout.CheckoutScreen
import com.kec.wms.pda.presentation.checkout.CheckoutViewModel
import com.kec.wms.pda.presentation.common.OperationScreenContainer
import com.kec.wms.pda.presentation.common.PdaUiEvent
import com.kec.wms.pda.presentation.common.PlaceholderScreen
import com.kec.wms.pda.presentation.home.HomeScreen
import com.kec.wms.pda.presentation.inventory.InventoryCountPhase
import com.kec.wms.pda.presentation.inventory.InventoryCountScreen
import com.kec.wms.pda.presentation.inventory.InventoryCountViewModel
import com.kec.wms.pda.presentation.inventory.InventoryQueryScreen
import com.kec.wms.pda.presentation.inventory.InventoryQueryViewModel
import com.kec.wms.pda.presentation.inventory.InventoryTransferScreen
import com.kec.wms.pda.presentation.inventory.InventoryViewModel
import com.kec.wms.pda.presentation.inventory.InventoryWorkflowMode
import com.kec.wms.pda.presentation.manifest.ManifestMountScreen
import com.kec.wms.pda.presentation.manifest.ManifestMountViewModel
import com.kec.wms.pda.presentation.picking.PickingPhase
import com.kec.wms.pda.presentation.picking.PickingScreen
import com.kec.wms.pda.presentation.picking.PickingViewModel
import com.kec.wms.pda.presentation.putaway.PutawayEntryScreen
import com.kec.wms.pda.presentation.putaway.PUTAWAY_MODE_CONTAINER
import com.kec.wms.pda.presentation.putaway.PUTAWAY_MODE_SKU
import com.kec.wms.pda.presentation.putaway.PutawaySkuScreen
import com.kec.wms.pda.presentation.putaway.PutawaySkuViewModel
import com.kec.wms.pda.presentation.receiving.AsnScanScreen
import com.kec.wms.pda.presentation.receiving.AsnSignInScreen
import com.kec.wms.pda.presentation.receiving.AsnSignInViewModel
import com.kec.wms.pda.presentation.receiving.RECEIVING_MODE_CONTAINER
import com.kec.wms.pda.presentation.receiving.RECEIVING_MODE_SKU
import com.kec.wms.pda.presentation.receiving.ReceivingViewModel
import com.kec.wms.pda.presentation.receiving.ReceivingOperationScreen
import com.kec.wms.pda.presentation.returns.ReturnCountingScreen
import com.kec.wms.pda.presentation.returns.ReturnCountingViewModel
import com.kec.wms.pda.presentation.returns.ReturnPutawayScreen
import com.kec.wms.pda.presentation.returns.ReturnPutawayViewModel
import com.kec.wms.pda.presentation.returns.ReturnSignInScreen
import com.kec.wms.pda.presentation.returns.ReturnSignInViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.collectLatest

data class PdaAppContext(
    val currentUser: LoginUserInfo?,
    val currentTenantCode: String,
    val currentUsername: String,
    val pendingReceivingAsnNumber: String?,
    val appUpdateUiState: AppUpdateUiState,
    val navigateTo: (String) -> Unit,
    val goHome: () -> Unit,
    val logout: () -> Unit,
    val checkForAppUpdate: (Boolean) -> Unit,
    val onUiEvent: (PdaUiEvent) -> Unit,
)

sealed class PdaScreenSpec(
    val route: String
) {
    @Composable
    abstract fun Render(app: PdaAppContext)

    data object Home : PdaScreenSpec(PdaRoutes.HOME) {
        @Composable
        override fun Render(app: PdaAppContext) {
            HomeScreen(
                currentUser = app.currentUser,
                currentTenantCode = app.currentTenantCode,
                currentUsername = app.currentUsername,
                appUpdateUiState = app.appUpdateUiState,
                onCheckForUpdate = { app.checkForAppUpdate(true) },
                onNavigateTo = app.navigateTo,
                onLogout = app.logout
            )
        }
    }

    data object AsnSignIn : PdaScreenSpec(PdaRoutes.ASN_SIGN_IN) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: AsnSignInViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.finishSignInFlow()
                app.goHome()
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)

            OperationScreenContainer {
                AsnSignInScreen(
                    uiState = uiState,
                    onSubmitSignIn = viewModel::signInAsn,
                    onResetState = viewModel::finishSignInFlow,
                    onBack = onBack
                )
            }
        }
    }

    data object AsnScan : PdaScreenSpec(PdaRoutes.ASN_SCAN) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: ReceivingViewModel = hiltViewModel()
            val onBack = {
                viewModel.reset()
                app.goHome()
            }

            BackHandler(onBack = onBack)

            OperationScreenContainer {
                AsnScanScreen(
                    onOpenSkuReceiving = {
                        app.navigateTo(PdaRoutes.SKU_RECEIVING)
                    },
                    onOpenContainerReceiving = {
                        app.navigateTo(PdaRoutes.CONTAINER_RECEIVING)
                    },
                    onBack = onBack
                )
            }
        }
    }

    data object SkuReceiving : PdaScreenSpec(PdaRoutes.SKU_RECEIVING) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: ReceivingViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.navigateTo(PdaRoutes.ASN_SCAN)
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)
            LaunchedEffect(Unit) {
                viewModel.enterMode(RECEIVING_MODE_SKU)
            }

            OperationScreenContainer {
                ReceivingOperationScreen(
                    uiState = uiState,
                    onAsnNumberChange = viewModel::updateAsnNumber,
                    onLoadAsn = viewModel::loadAsn,
                    onContainerCodeChange = viewModel::updateContainerCode,
                    onScanContainer = viewModel::scanContainer,
                    onSkuCodeChange = viewModel::updateSkuCode,
                    onScanSku = viewModel::scanSku,
                    onReceivedQtyChange = viewModel::updateReceivedQty,
                    onQualityStatusChange = viewModel::updateQualityStatus,
                    onBatchLineSelected = viewModel::selectBatchLine,
                    onExpiryDateChange = viewModel::updateExpiryDate,
                    onCaptureFirstReceiving = viewModel::captureFirstReceiving,
                    onSubmit = viewModel::submitReceiving,
                    onBack = onBack
                )
            }
        }
    }

    data object ContainerReceiving : PdaScreenSpec(PdaRoutes.CONTAINER_RECEIVING) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: ReceivingViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.navigateTo(PdaRoutes.ASN_SCAN)
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)
            LaunchedEffect(Unit) {
                viewModel.enterMode(RECEIVING_MODE_CONTAINER)
            }

            OperationScreenContainer {
                ReceivingOperationScreen(
                    uiState = uiState,
                    onAsnNumberChange = viewModel::updateAsnNumber,
                    onLoadAsn = viewModel::loadAsn,
                    onContainerCodeChange = viewModel::updateContainerCode,
                    onScanContainer = viewModel::scanContainer,
                    onSkuCodeChange = viewModel::updateSkuCode,
                    onScanSku = viewModel::scanSku,
                    onReceivedQtyChange = viewModel::updateReceivedQty,
                    onQualityStatusChange = viewModel::updateQualityStatus,
                    onBatchLineSelected = viewModel::selectBatchLine,
                    onExpiryDateChange = viewModel::updateExpiryDate,
                    onCaptureFirstReceiving = viewModel::captureFirstReceiving,
                    onSubmit = viewModel::submitReceiving,
                    onBack = onBack
                )
            }
        }
    }

    data object Putaway : PdaScreenSpec(PdaRoutes.PUTAWAY) {
        @Composable
        override fun Render(app: PdaAppContext) {
            BackHandler(onBack = app.goHome)

            OperationScreenContainer {
                PutawayEntryScreen(
                    onOpenSkuPutaway = { app.navigateTo(PdaRoutes.PUTAWAY_SKU) },
                    onOpenContainerPutaway = { app.navigateTo(PdaRoutes.PUTAWAY_CONTAINER) },
                    onBack = app.goHome
                )
            }
        }
    }

    data object PutawaySku : PdaScreenSpec(PdaRoutes.PUTAWAY_SKU) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: PutawaySkuViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.navigateTo(PdaRoutes.PUTAWAY)
            }
            BackHandler(onBack = onBack)
            LaunchedEffect(Unit) {
                viewModel.enterMode(PUTAWAY_MODE_SKU)
            }

            OperationScreenContainer {
                PutawaySkuScreen(
                    uiState = uiState,
                    onOrderInputChange = viewModel::updateOrderInput,
                    onLoadOrder = viewModel::loadOrder,
                    onSkuInputChange = viewModel::updateSkuInput,
                    onScanSku = viewModel::scanSku,
                    onSelectTask = viewModel::selectTask,
                    onLocationInputChanged = viewModel::clearCurrentLocation,
                    onLookupLocation = viewModel::lookupLocation,
                    onSubmitPutaway = viewModel::submitPutaway,
                    onBack = onBack
                )
            }
        }
    }

    data object PutawayContainer : PdaScreenSpec(PdaRoutes.PUTAWAY_CONTAINER) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: PutawaySkuViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.navigateTo(PdaRoutes.PUTAWAY)
            }
            BackHandler(onBack = onBack)
            LaunchedEffect(Unit) {
                viewModel.enterMode(PUTAWAY_MODE_CONTAINER)
            }

            OperationScreenContainer {
                PutawaySkuScreen(
                    uiState = uiState,
                    onOrderInputChange = viewModel::updateOrderInput,
                    onLoadOrder = viewModel::loadOrder,
                    onSkuInputChange = viewModel::updateSkuInput,
                    onScanSku = viewModel::scanSku,
                    onSelectTask = viewModel::selectTask,
                    onLocationInputChanged = viewModel::clearCurrentLocation,
                    onLookupLocation = viewModel::lookupLocation,
                    onSubmitPutaway = viewModel::submitPutaway,
                    onBack = onBack
                )
            }
        }
    }

    data object ReturnSignIn : PdaScreenSpec(PdaRoutes.RETURN_SIGN_IN) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: ReturnSignInViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.goHome()
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)

            OperationScreenContainer {
                ReturnSignInScreen(
                    uiState = uiState,
                    onLogisticsNoChange = viewModel::updateLogisticsNo,
                    onLookup = viewModel::lookup,
                    onConfirm = viewModel::confirm,
                    onBack = onBack
                )
            }
        }
    }

    data object ReturnCounting : PdaScreenSpec(PdaRoutes.RETURN_COUNTING) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: ReturnCountingViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.goHome()
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)

            OperationScreenContainer {
                ReturnCountingScreen(
                    uiState = uiState,
                    onLogisticsNoChange = viewModel::updateLogisticsNo,
                    onLookup = viewModel::lookup,
                    onBarcodeChange = viewModel::updateBarcode,
                    onCountedQtyChange = viewModel::updateCountedQty,
                    onQualityChange = viewModel::updateQuality,
                    onBatchNumberChange = viewModel::updateBatchNumber,
                    onExpiryDateChange = viewModel::updateExpiryDate,
                    onContainerCodeChange = viewModel::updateContainerCode,
                    onTempLocationCodeChange = viewModel::updateTempLocationCode,
                    onPhotoCaptured = viewModel::uploadPhoto,
                    onSubmitLine = viewModel::submitLine,
                    onCompleteCounting = viewModel::completeCounting,
                    onBack = onBack
                )
            }
        }
    }

    data object ReturnPutaway : PdaScreenSpec(PdaRoutes.RETURN_PUTAWAY) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: ReturnPutawayViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.goHome()
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)
            LaunchedEffect(Unit) {
                viewModel.enterScreen()
            }

            OperationScreenContainer {
                ReturnPutawayScreen(
                    uiState = uiState,
                    onPutawayOrderNumberChange = viewModel::updatePutawayOrderNumber,
                    onScanOrder = viewModel::scanOrder,
                    onSelectOrder = viewModel::selectOrder,
                    onContainerCodeChange = viewModel::updateContainerCode,
                    onLogisticsNoChange = viewModel::updateLogisticsNo,
                    onBarcodeChange = viewModel::updateBarcode,
                    onQualityChange = viewModel::updateQuality,
                    onQuantityChange = viewModel::updateQuantity,
                    onTargetLocationCodeChange = viewModel::updateTargetLocationCode,
                    onRefresh = viewModel::loadOrders,
                    onExecute = viewModel::execute,
                    onBack = onBack
                )
            }
        }
    }

    data object Shipping : PdaScreenSpec(PdaRoutes.SHIPPING) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: CheckoutViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.resetWorkspace()
                app.goHome()
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)

            OperationScreenContainer {
                CheckoutScreen(
                    uiState = uiState,
                    onCheckoutTypeChange = viewModel::updateCheckoutType,
                    onOpenContainer = viewModel::openContainer,
                    onSubmitCheckout = viewModel::submitCheckout,
                    onConfirmCheckout = viewModel::confirmCheckout,
                    onResetWorkspace = viewModel::resetWorkspace,
                    onBack = onBack
                )
            }
        }
    }

    data object ManifestMount : PdaScreenSpec(PdaRoutes.MANIFEST_MOUNT) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: ManifestMountViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.resetWorkspace()
                app.goHome()
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)

            OperationScreenContainer {
                ManifestMountScreen(
                    uiState = uiState,
                    onValidateManifest = viewModel::validateManifest,
                    onScanCheckout = viewModel::scanCheckout,
                    onConfirmManifest = viewModel::confirmManifest,
                    onBack = onBack
                )
            }
        }
    }

    data object Picking : PdaScreenSpec(PdaRoutes.PICKING) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: PickingViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                if (uiState.phase == PickingPhase.LIST) {
                    viewModel.reset()
                    app.goHome()
                } else {
                    viewModel.backToList()
                }
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)
            LaunchedEffect(Unit) {
                viewModel.enterScreen()
            }

            OperationScreenContainer {
                PickingScreen(
                    uiState = uiState,
                    onTaskClick = viewModel::openTask,
                    onBindContainer = viewModel::bindContainer,
                    onValidateLocation = viewModel::validateLocation,
                    onValidateSku = viewModel::validateSku,
                    onSubmitCurrentLine = viewModel::submitCurrentLine,
                    onSkipCurrentLine = viewModel::skipCurrentLine,
                    onCompleteTask = viewModel::completePickingTask,
                    onClearFeedback = viewModel::clearFeedback,
                    onBack = onBack
                )
            }
        }
    }

    data object InventoryTransfer : PdaScreenSpec(PdaRoutes.TRANSFER) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: InventoryViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            BackHandler(onBack = app.goHome)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)
            LaunchedEffect(Unit) {
                viewModel.enterMode(InventoryWorkflowMode.Transfer)
            }
            OperationScreenContainer {
                InventoryTransferScreen(
                    uiState = uiState,
                    onSourceLocationChange = viewModel::updateSourceLocation,
                    onSubmitSourceLocation = viewModel::updateSourceLocation,
                    onSkuOrBarcodeChange = viewModel::updateSkuOrBarcode,
                    onSubmitSkuOrBarcode = {
                        viewModel.updateSkuOrBarcode(it)
                        viewModel.lookupInventory()
                    },
                    onTargetLocationChange = viewModel::updateTargetLocation,
                    onInventoryCandidateSelected = viewModel::selectCandidate,
                    onAsnSelectorDismiss = viewModel::dismissAsnSelectorDialog,
                    onAdjustTypeChange = viewModel::updateAdjustType,
                    onAdjustQuantityChange = viewModel::updateAdjustQuantity,
                    onAdjustReasonChange = viewModel::updateAdjustReason,
                    onSubmit = viewModel::submit,
                    onBack = app.goHome
                )
            }
        }
    }

    data object InventoryQuery : PdaScreenSpec(PdaRoutes.INVENTORY_QUERY) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: InventoryQueryViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                viewModel.reset()
                app.goHome()
            }
            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)
            LaunchedEffect(Unit) {
                viewModel.reset()
            }

            OperationScreenContainer {
                InventoryQueryScreen(
                    uiState = uiState,
                    onSkuOrBarcodeChange = viewModel::updateSkuOrBarcode,
                    onLocationCodeChange = viewModel::updateLocationCode,
                    onSearch = viewModel::search,
                    onBack = onBack
                )
            }
        }
    }

    data object InventoryCount : PdaScreenSpec(PdaRoutes.CYCLE_COUNT) {
        @Composable
        override fun Render(app: PdaAppContext) {
            val viewModel: InventoryCountViewModel = hiltViewModel()
            val uiState by viewModel.uiState.collectAsState()
            val onBack = {
                if (uiState.phase == InventoryCountPhase.List) {
                    viewModel.reset()
                    app.goHome()
                } else {
                    viewModel.backToList()
                }
            }

            BackHandler(onBack = onBack)
            CollectUiEvents(viewModel.uiEvents, app.onUiEvent)
            LaunchedEffect(Unit) {
                viewModel.enterScreen()
            }

            OperationScreenContainer {
                InventoryCountScreen(
                    uiState = uiState,
                    onBatchClick = viewModel::openBatch,
                    onLocationChange = viewModel::updateLocationInput,
                    onSkuChange = viewModel::updateSkuInput,
                    onQuantityChange = viewModel::updateQuantityInput,
                    onValidateLocation = viewModel::validateLocation,
                    onValidateSku = viewModel::validateSku,
                    onSubmit = viewModel::submitCurrentLine,
                    onClearFeedback = viewModel::clearFeedback,
                    onBack = onBack
                )
            }
        }
    }

    class Placeholder(
        route: String,
        private val titleRes: Int
    ) : PdaScreenSpec(route) {
        @Composable
        override fun Render(app: PdaAppContext) {
            BackHandler(onBack = app.goHome)
            PlaceholderScreen(title = titleRes, onBack = app.goHome)
        }
    }

    companion object {
        private val specs = listOf(
            Home,
            AsnSignIn,
            AsnScan,
            SkuReceiving,
            ContainerReceiving,
            Putaway,
            PutawaySku,
            PutawayContainer,
            ReturnSignIn,
            ReturnCounting,
            ReturnPutaway,
            Shipping,
            ManifestMount,
            Picking,
            Placeholder(PdaRoutes.CHECKING, R.string.menu_checking),
            InventoryCount,
            InventoryTransfer,
            InventoryQuery,
        )

        fun fromRoute(route: String): PdaScreenSpec {
            return specs.firstOrNull { it.route == route } ?: Home
        }
    }
}

@Composable
private fun CollectUiEvents(
    events: Flow<PdaUiEvent>,
    onUiEvent: (PdaUiEvent) -> Unit
) {
    LaunchedEffect(events) {
        events.collectLatest { event ->
            onUiEvent(event)
        }
    }
}
