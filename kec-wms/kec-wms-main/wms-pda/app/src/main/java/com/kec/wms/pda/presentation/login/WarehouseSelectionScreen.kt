package com.kec.wms.pda.presentation.login

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.HomeWork
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kec.wms.pda.R
import com.kec.wms.pda.data.model.LoginUserInfo
import com.kec.wms.pda.data.model.UserWarehouseBinding
import com.kec.wms.pda.presentation.common.PdaBottomActionBar
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant
import com.kec.wms.pda.presentation.common.PdaFeedbackBanner
import com.kec.wms.pda.presentation.common.PdaFeedbackTone
import com.kec.wms.pda.presentation.common.PdaTopBar

@Composable
fun WarehouseSelectionScreen(
    currentUser: LoginUserInfo?,
    onWarehouseSelected: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: WarehouseSelectionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.completedWarehouseId) {
        uiState.completedWarehouseId?.let(onWarehouseSelected)
    }

    Scaffold(
        topBar = {
            PdaTopBar(title = stringResource(R.string.login_select_warehouse_title))
        },
        bottomBar = {
            PdaBottomActionBar {
                PdaButton(
                    text = if (uiState.isSubmitting) {
                        stringResource(R.string.login_select_warehouse_confirming)
                    } else {
                        stringResource(R.string.login_select_warehouse_confirm)
                    },
                    onClick = viewModel::confirmSelection,
                    enabled = !uiState.isLoading && !uiState.isSubmitting && uiState.warehouses.isNotEmpty(),
                    isLoading = uiState.isSubmitting
                )
                if (uiState.warehouses.isEmpty()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    PdaButton(
                        text = stringResource(R.string.home_sign_out),
                        onClick = onLogout,
                        variant = PdaButtonVariant.Secondary
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(MaterialTheme.colorScheme.background)
        ) {
            when {
                uiState.isLoading -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                else -> {
                    WarehouseSelectionContent(
                        currentUser = currentUser,
                        warehouses = uiState.warehouses,
                        selectedWarehouseId = uiState.selectedWarehouseId,
                        error = uiState.error,
                        onWarehouseClick = viewModel::updateSelectedWarehouse
                    )
                }
            }
        }
    }
}

@Composable
private fun WarehouseSelectionContent(
    currentUser: LoginUserInfo?,
    warehouses: List<UserWarehouseBinding>,
    selectedWarehouseId: String,
    error: String?,
    onWarehouseClick: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f)
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = stringResource(R.string.login_select_warehouse_title),
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = if (currentUser?.username.isNullOrBlank()) {
                            stringResource(R.string.login_select_warehouse_subtitle)
                        } else {
                            stringResource(
                                R.string.login_select_warehouse_subtitle_with_user,
                                currentUser?.username.orEmpty()
                            )
                        },
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 20.sp
                    )
                }
            }
        }

        if (!error.isNullOrBlank()) {
            item {
                PdaFeedbackBanner(
                    message = error,
                    tone = PdaFeedbackTone.Error
                )
            }
        }

        if (warehouses.isEmpty()) {
            item {
                Text(
                    text = stringResource(R.string.login_select_warehouse_empty_hint),
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            items(warehouses, key = { it.warehouseId }) { warehouse ->
                WarehouseOptionCard(
                    warehouse = warehouse,
                    selected = warehouse.warehouseId == selectedWarehouseId,
                    onClick = { onWarehouseClick(warehouse.warehouseId) }
                )
            }
        }
    }
}

@Composable
private fun WarehouseOptionCard(
    warehouse: UserWarehouseBinding,
    selected: Boolean,
    onClick: () -> Unit
) {
    val containerColor = if (selected) {
        MaterialTheme.colorScheme.primaryContainer
    } else {
        MaterialTheme.colorScheme.surface
    }
    val contentColor = if (selected) {
        MaterialTheme.colorScheme.onPrimaryContainer
    } else {
        MaterialTheme.colorScheme.onSurface
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = if (selected) 4.dp else 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(40.dp),
                shape = RoundedCornerShape(12.dp),
                color = MaterialTheme.colorScheme.primary.copy(alpha = if (selected) 0.22f else 0.12f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = Icons.Filled.HomeWork,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }

            Spacer(modifier = Modifier.size(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = warehouse.warehouseCode,
                    fontWeight = FontWeight.SemiBold,
                    color = contentColor
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = warehouse.warehouseName,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (selected) {
                Text(
                    text = stringResource(R.string.login_select_warehouse_selected),
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
