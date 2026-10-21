package com.kec.wms.pda.presentation.home

import androidx.annotation.StringRes
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.HomeWork
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.kec.wms.pda.AppUpdateUiState
import com.kec.wms.pda.BuildConfig
import com.kec.wms.pda.R
import com.kec.wms.pda.presentation.common.PdaButton
import com.kec.wms.pda.presentation.common.PdaButtonVariant
import com.kec.wms.pda.data.model.LoginUserInfo
import com.kec.wms.pda.presentation.common.PdaTopBar
import com.kec.wms.pda.presentation.theme.PdaThemePresets

private enum class HomeTab(
    @StringRes val titleRes: Int
) {
    Workbench(R.string.home_tab_workbench),
    Mine(R.string.home_tab_mine)
}

/**
 * 登录后的首页容器
 * 默认显示工作台，并提供底部「工作台 / 我的」切换
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    currentUser: LoginUserInfo?,
    currentTenantCode: String,
    currentUsername: String,
    appUpdateUiState: AppUpdateUiState,
    onCheckForUpdate: () -> Unit,
    onNavigateTo: (String) -> Unit,
    onLogout: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by rememberSaveable { mutableStateOf(HomeTab.Workbench) }

    LaunchedEffect(Unit) {
        viewModel.refreshPermissions()
    }

    Scaffold(
        topBar = {
            val selectedTabTitle = stringResource(selectedTab.titleRes)
            PdaTopBar(
                title = selectedTabTitle,
                trailingContent = if (selectedTab == HomeTab.Mine) {
                    {
                        IconButton(onClick = onLogout, modifier = Modifier.size(36.dp)) {
                            Icon(
                                imageVector = Icons.Default.ExitToApp,
                                contentDescription = stringResource(R.string.home_sign_out),
                                tint = MaterialTheme.colorScheme.onPrimary
                            )
                        }
                    }
                } else {
                    null
                }
            )
        },
        bottomBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f))
            ) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = 0.45f))
                NavigationBar(
                    modifier = Modifier.height(68.dp),
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
                    tonalElevation = 0.dp,
                    windowInsets = WindowInsets(0, 0, 0, 0)
                ) {
                    NavigationBarItem(
                        selected = selectedTab == HomeTab.Workbench,
                        onClick = { selectedTab = HomeTab.Workbench },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        icon = {
                            Icon(
                                imageVector = Icons.Default.HomeWork,
                                contentDescription = stringResource(R.string.home_tab_workbench)
                            )
                        },
                        label = { Text(stringResource(R.string.home_tab_workbench)) }
                    )
                    NavigationBarItem(
                        selected = selectedTab == HomeTab.Mine,
                        onClick = { selectedTab = HomeTab.Mine },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        icon = {
                            Icon(
                                imageVector = Icons.Default.AccountCircle,
                                contentDescription = stringResource(R.string.home_tab_mine)
                            )
                        },
                        label = { Text(stringResource(R.string.home_tab_mine)) }
                    )
                }
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when {
                uiState.isLoading && uiState.modules.isEmpty() -> {
                    CircularProgressIndicator(modifier = Modifier.align(Alignment.Center))
                }

                selectedTab == HomeTab.Workbench -> {
                    WorkbenchScreen(
                        modules = uiState.modules,
                        onNavigateTo = onNavigateTo
                    )
                }

                else -> {
                    MineScreen(
                        currentUser = currentUser,
                        currentTenantCode = currentTenantCode,
                        currentUsername = currentUsername,
                        tenantCode = uiState.savedTenantCode,
                        username = uiState.savedUsername,
                        themeId = uiState.themeId,
                        onThemeSelected = viewModel::updateThemeId,
                        soundEnabled = uiState.soundEnabled,
                        onSoundEnabledChange = viewModel::updateSoundEnabled,
                        vibrationEnabled = uiState.vibrationEnabled,
                        onVibrationEnabledChange = viewModel::updateVibrationEnabled,
                        appUpdateUiState = appUpdateUiState,
                        onCheckForUpdate = onCheckForUpdate,
                        onLogout = onLogout
                    )
                }
            }
        }
    }
}

@Composable
private fun MineScreen(
    currentUser: LoginUserInfo?,
    currentTenantCode: String,
    currentUsername: String,
    tenantCode: String,
    username: String,
    themeId: String,
    onThemeSelected: (String) -> Unit,
    soundEnabled: Boolean,
    onSoundEnabledChange: (Boolean) -> Unit,
    vibrationEnabled: Boolean,
    onVibrationEnabledChange: (Boolean) -> Unit,
    appUpdateUiState: AppUpdateUiState,
    onCheckForUpdate: () -> Unit,
    onLogout: () -> Unit
) {
    val resolvedUsername = currentUser?.username
        ?: currentUsername.takeIf { it.isNotBlank() }
        ?: username
    val resolvedTenantCode = currentUser?.tenantCode
        ?: currentTenantCode.takeIf { it.isNotBlank() }
        ?: tenantCode
    val resolvedDisplayName = currentUser?.fullName
        ?.takeIf { it.isNotBlank() }
        ?: resolvedUsername.takeIf { it.isNotBlank() }
        ?: stringResource(R.string.home_current_session)
    val resolvedTenantName = currentUser?.tenantName?.takeIf { it.isNotBlank() }
    val tenantSummary = when {
        resolvedTenantName != null && resolvedTenantCode.isNotBlank() -> {
            stringResource(
                R.string.home_tenant_with_name_format,
                resolvedTenantName,
                resolvedTenantCode
            )
        }
        resolvedTenantCode.isNotBlank() -> {
            stringResource(R.string.home_tenant_format, resolvedTenantCode)
        }
        else -> stringResource(R.string.home_tenant_unavailable)
    }
    val applicationLines = listOf(
        stringResource(R.string.home_system_format, stringResource(R.string.brand_kec_wms_pda)),
        stringResource(R.string.home_version_format, BuildConfig.VERSION_NAME)
    )
    val userTypeLine = currentUser?.userType?.takeIf { it.isNotBlank() }?.let { userType ->
        stringResource(R.string.home_user_type_format, userType)
    }
    val emailLine = currentUser?.email?.takeIf { it.isNotBlank() }?.let { email ->
        stringResource(R.string.home_email_format, email)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.primaryContainer
        ) {
            Column(
                modifier = Modifier.padding(horizontal = 18.dp, vertical = 18.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = resolvedDisplayName,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
                IdentityTagRow(
                    tags = listOfNotNull(
                        resolvedUsername.takeIf { it.isNotBlank() }?.let {
                            stringResource(R.string.home_identity_account, it)
                        },
                        resolvedTenantCode.takeIf { it.isNotBlank() }?.let {
                            stringResource(R.string.home_identity_tenant, it)
                        },
                        currentUser?.userType?.takeIf { it.isNotBlank() }
                    )
                )
                Text(
                    text = tenantSummary,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.80f)
                )
                emailLine?.let { line ->
                    Text(
                        text = line,
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.78f)
                    )
                }
            }
        }

        InfoCard(
            applicationTitle = stringResource(R.string.home_application_info),
            applicationLines = applicationLines,
            preferencesTitle = stringResource(R.string.home_preferences_title),
            themeTitle = stringResource(R.string.home_theme_title),
            themeDescription = stringResource(R.string.home_theme_description),
            selectedThemeId = themeId,
            onThemeSelected = onThemeSelected,
            soundTitle = stringResource(R.string.home_sound_title),
            soundDescription = stringResource(R.string.home_sound_description),
            soundEnabled = soundEnabled,
            onSoundEnabledChange = onSoundEnabledChange,
            vibrationTitle = stringResource(R.string.home_vibration_title),
            vibrationDescription = stringResource(R.string.home_vibration_description),
            vibrationEnabled = vibrationEnabled,
            onVibrationEnabledChange = onVibrationEnabledChange,
            appUpdateUiState = appUpdateUiState,
            onCheckForUpdate = onCheckForUpdate
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            PdaButton(
                text = stringResource(R.string.home_sign_out),
                onClick = onLogout,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 4.dp),
                variant = PdaButtonVariant.Text,
                contentColor = MaterialTheme.colorScheme.error,
                leadingIcon = Icons.Default.ExitToApp,
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun IdentityTagRow(tags: List<String>) {
    if (tags.isEmpty()) {
        return
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        tags.forEach { tag ->
            Surface(
                shape = RoundedCornerShape(999.dp),
                color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.10f)
            ) {
                Text(
                    text = tag,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.92f)
                )
            }
        }
    }
}

@Composable
private fun InfoCard(
    applicationTitle: String,
    applicationLines: List<String>,
    preferencesTitle: String,
    themeTitle: String,
    themeDescription: String,
    selectedThemeId: String,
    onThemeSelected: (String) -> Unit,
    soundTitle: String,
    soundDescription: String,
    soundEnabled: Boolean,
    onSoundEnabledChange: (Boolean) -> Unit,
    vibrationTitle: String,
    vibrationDescription: String,
    vibrationEnabled: Boolean,
    onVibrationEnabledChange: (Boolean) -> Unit,
    appUpdateUiState: AppUpdateUiState,
    onCheckForUpdate: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = preferencesTitle,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            ThemeSelectionSection(
                title = themeTitle,
                description = themeDescription,
                selectedThemeId = selectedThemeId,
                onThemeSelected = onThemeSelected
            )
            SectionDivider()
            PreferenceRow(
                title = soundTitle,
                description = soundDescription,
                checked = soundEnabled,
                onCheckedChange = onSoundEnabledChange
            )
            PreferenceRow(
                title = vibrationTitle,
                description = vibrationDescription,
                checked = vibrationEnabled,
                onCheckedChange = onVibrationEnabledChange
            )

            SectionDivider()

            SettingsSection(
                title = applicationTitle,
                rows = applicationLines
            )

            SectionDivider()

            UpdateSection(
                state = appUpdateUiState,
                onCheckForUpdate = onCheckForUpdate
            )
        }
    }
}

@Composable
private fun SettingsSection(
    title: String,
    rows: List<String>
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        rows.forEach { row ->
            Text(
                text = row,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun UpdateSection(
    state: AppUpdateUiState,
    onCheckForUpdate: () -> Unit
) {
    val latestVersionLine = state.latestVersionName?.let { versionName ->
        stringResource(R.string.home_update_latest_version_format, versionName)
    } ?: stringResource(R.string.home_update_latest_unknown)
    val progressLine = if (state.isDownloading && state.downloadProgressPercent != null) {
        stringResource(R.string.app_update_download_progress, state.downloadProgressPercent)
    } else {
        null
    }

    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = stringResource(R.string.home_update_title),
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = latestVersionLine,
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        progressLine?.let { line ->
            Text(
                text = line,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.primary
            )
        }

        state.statusMessage?.let { message ->
            Text(
                text = message,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.primary
            )
        }

        if (state.releaseNotes.isNotEmpty()) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = stringResource(R.string.app_update_release_notes_title),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                state.releaseNotes.forEach { note ->
                    Text(
                        text = "- $note",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        PdaButton(
            text = if (state.isChecking) {
                stringResource(R.string.home_update_checking)
            } else {
                stringResource(R.string.home_update_action_check)
            },
            onClick = onCheckForUpdate,
            enabled = !state.isChecking,
            variant = PdaButtonVariant.Secondary,
            fillMaxWidth = true,
            fontSize = 15.sp
        )
    }
}

@Composable
private fun PreferenceRow(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = description,
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

@Composable
private fun SectionDivider() {
    HorizontalDivider(
        color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)
    )
}

@Composable
private fun ThemeSelectionSection(
    title: String,
    description: String,
    selectedThemeId: String,
    onThemeSelected: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = description,
            fontSize = 13.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        PdaThemePresets.all.chunked(4).forEach { rowPresets ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                rowPresets.forEach { preset ->
                    ThemePresetCard(
                        modifier = Modifier.weight(1f),
                        name = stringResource(preset.nameRes),
                        selected = preset.id == selectedThemeId,
                        color = preset.lightPrimary,
                        onClick = { onThemeSelected(preset.id) }
                    )
                }
                repeat(4 - rowPresets.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun ThemePresetCard(
    name: String,
    color: androidx.compose.ui.graphics.Color,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        border = if (selected) {
            androidx.compose.foundation.BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary)
        } else {
            null
        }
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(18.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .border(
                        width = if (selected) 1.dp else 0.dp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.12f),
                        shape = RoundedCornerShape(999.dp)
                    ),
                shape = RoundedCornerShape(999.dp),
                color = color
            ) {}

            Text(
                text = name,
                fontSize = 10.sp,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                maxLines = 2
            )
        }
    }
}
