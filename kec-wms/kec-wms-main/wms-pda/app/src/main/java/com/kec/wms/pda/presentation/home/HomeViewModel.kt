package com.kec.wms.pda.presentation.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.data.local.LoginPreferences
import com.kec.wms.pda.data.model.PdaMenuConfig
import com.kec.wms.pda.data.model.PdaModule
import com.kec.wms.pda.domain.usecase.GetPermissionsUseCase
import com.kec.wms.pda.navigation.PdaRoutes
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * 首页 UI 状态
 */
data class HomeUiState(
    val modules: List<PdaModule> = emptyList(),
    val isLoading: Boolean = false,
    val savedTenantCode: String = "",
    val savedUsername: String = "",
    val soundEnabled: Boolean = true,
    val vibrationEnabled: Boolean = true,
    val themeId: String = "kerry_orange"
)

/**
 * 首页 ViewModel
 * 负责加载权限并过滤模块菜单。
 */
@HiltViewModel
class HomeViewModel @Inject constructor(
    private val getPermissionsUseCase: GetPermissionsUseCase,
    private val loginPreferences: LoginPreferences
) : ViewModel() {

    private val fallbackScreens = setOf(
        PdaRoutes.ASN_SIGN_IN,
        PdaRoutes.ASN_SCAN,
        PdaRoutes.SHIPPING
    )

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    init {
        observeSavedLoginInfo()
        loadModules()
    }

    private fun observeSavedLoginInfo() {
        viewModelScope.launch {
            loginPreferences.tenantCode.collectLatest { tenantCode ->
                _uiState.value = _uiState.value.copy(savedTenantCode = tenantCode)
            }
        }
        viewModelScope.launch {
            loginPreferences.username.collectLatest { username ->
                _uiState.value = _uiState.value.copy(savedUsername = username)
            }
        }
        viewModelScope.launch {
            loginPreferences.soundEnabled.collectLatest { enabled ->
                _uiState.value = _uiState.value.copy(soundEnabled = enabled)
            }
        }
        viewModelScope.launch {
            loginPreferences.vibrationEnabled.collectLatest { enabled ->
                _uiState.value = _uiState.value.copy(vibrationEnabled = enabled)
            }
        }
        viewModelScope.launch {
            loginPreferences.themeId.collectLatest { themeId ->
                _uiState.value = _uiState.value.copy(themeId = themeId)
            }
        }
    }

    /**
     * 加载并按权限过滤模块菜单。
     */
    private fun loadModules() {
        val permissions = getPermissionsUseCase.getCachedPermissions()
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
        Log.d("HomeViewModel", "当前权限: $permissions")

        if (permissions.isEmpty()) {
            Log.w("HomeViewModel", "权限列表为空，使用已接通功能兜底菜单")
            _uiState.value = _uiState.value.copy(modules = buildFallbackModules())
            return
        }

        val filteredModules = PdaMenuConfig.allModules().mapNotNull { module ->
            val filteredItems = module.menuItems.filter { menuItem ->
                menuItem.permissions.any(permissions::contains)
            }

            if (filteredItems.isEmpty()) {
                null
            } else {
                module.copy(menuItems = filteredItems)
            }
        }

        if (filteredModules.isEmpty()) {
            Log.w(
                "HomeViewModel",
                "权限存在但未匹配到任何 PDA 菜单，使用已接通功能兜底菜单: $permissions"
            )
            _uiState.value = _uiState.value.copy(modules = buildFallbackModules())
            return
        }

        _uiState.value = _uiState.value.copy(modules = filteredModules)
    }

    private fun buildFallbackModules(): List<PdaModule> {
        return PdaMenuConfig.allModules().mapNotNull { module ->
            val fallbackItems = module.menuItems.filter { it.screen in fallbackScreens }
            if (fallbackItems.isEmpty()) {
                null
            } else {
                module.copy(menuItems = fallbackItems)
            }
        }
    }

    /**
     * 从服务端刷新权限后重新加载菜单。
     */
    fun refreshPermissions() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                getPermissionsUseCase.refreshPermissions()
                loadModules()
            } catch (e: Exception) {
                Log.e("HomeViewModel", "刷新权限失败: ${e.message}")
            } finally {
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }

    fun updateSoundEnabled(enabled: Boolean) {
        viewModelScope.launch {
            loginPreferences.saveSoundEnabled(enabled)
        }
    }

    fun updateVibrationEnabled(enabled: Boolean) {
        viewModelScope.launch {
            loginPreferences.saveVibrationEnabled(enabled)
        }
    }

    fun updateThemeId(themeId: String) {
        viewModelScope.launch {
            loginPreferences.saveThemeId(themeId)
        }
    }
}
