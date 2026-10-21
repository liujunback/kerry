package com.kec.wms.pda.presentation.login

import android.content.Context
import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kec.wms.pda.R
import com.kec.wms.pda.data.local.LoginPreferences
import com.kec.wms.pda.data.model.LoginUserInfo
import com.kec.wms.pda.domain.usecase.LoginUseCase
import com.kec.wms.pda.domain.usecase.QrCodeLoginUseCase
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * 登录界面ViewModel
 */
@HiltViewModel
class LoginViewModel @Inject constructor(
    private val loginUseCase: LoginUseCase,
    private val qrCodeLoginUseCase: QrCodeLoginUseCase,
    private val loginPreferences: LoginPreferences,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    init {
        // 加载保存的登录信息
        loadSavedLoginInfo()
    }

    /**
     * 加载保存的登录信息
     */
    private fun loadSavedLoginInfo() {
        viewModelScope.launch {
            loginPreferences.tenantCode.collect { tenantCode ->
                _uiState.update { it.copy(savedTenantCode = tenantCode) }
            }
        }
        viewModelScope.launch {
            loginPreferences.username.collect { username ->
                _uiState.update { it.copy(savedUsername = username) }
            }
        }
        viewModelScope.launch {
            loginPreferences.rememberMe.collect { rememberMe ->
                _uiState.update { it.copy(rememberMe = rememberMe) }
            }
        }
    }

    /**
     * 更新"记住我"状态
     */
    fun updateRememberMe(rememberMe: Boolean) {
        _uiState.update { it.copy(rememberMe = rememberMe) }
    }

    /**
     * 执行登录
     */
    fun login(tenantCode: String, username: String, password: String) {
        Log.d("LoginViewModel", "login() 被调用")
        viewModelScope.launch(Dispatchers.IO) {  // 明确使用IO调度器
            Log.d("LoginViewModel", "协程开始执行，线程: ${Thread.currentThread().name}")
            withContext(Dispatchers.Main) {
                _uiState.update { it.copy(isLoading = true, error = null) }
            }

            val result = loginUseCase(tenantCode, username, password)
            Log.d("LoginViewModel", "UseCase执行完成")

            withContext(Dispatchers.Main) {
                result
                    .onSuccess { loginResponse ->
                        Log.d("LoginViewModel", "登录成功")
                        // 保存登录信息
                        loginPreferences.saveLoginInfo(
                            tenantCode = tenantCode,
                            username = username,
                            rememberMe = _uiState.value.rememberMe
                        )

                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isSuccess = true,
                                user = loginResponse.user,
                                error = null
                            )
                        }
                    }
                    .onFailure { error ->
                        Log.e("LoginViewModel", "登录失败: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isSuccess = false,
                                error = error.message ?: context.getString(R.string.login_error_failed)
                            )
                        }
                    }
            }
        }
    }

    /**
     * 清除错误信息
     */
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    /**
     * 重置登录状态
     */
    fun resetLoginState() {
        _uiState.update { it.copy(isSuccess = false) }
    }

    /**
     * 扫码登录
     * @param qrContent 二维码扫描得到的内容
     */
    fun qrCodeLogin(qrContent: String) {
        Log.d("LoginViewModel", "qrCodeLogin() 被调用")
        viewModelScope.launch(Dispatchers.IO) {
            Log.d("LoginViewModel", "扫码登录协程开始执行")
            withContext(Dispatchers.Main) {
                _uiState.update { it.copy(isLoading = true, error = null) }
            }

            val result = qrCodeLoginUseCase(qrContent)
            Log.d("LoginViewModel", "扫码登录UseCase执行完成")

            withContext(Dispatchers.Main) {
                result
                    .onSuccess { loginResponse ->
                        Log.d("LoginViewModel", "扫码登录成功")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isSuccess = true,
                                user = loginResponse.user,
                                error = null
                            )
                        }
                    }
                    .onFailure { error ->
                        Log.e("LoginViewModel", "扫码登录失败: ${error.message}")
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                isSuccess = false,
                                error = error.message ?: context.getString(R.string.login_error_qr_failed)
                            )
                        }
                    }
            }
        }
    }
}

/**
 * 登录UI状态
 */
data class LoginUiState(
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val user: LoginUserInfo? = null,
    val error: String? = null,

    // 保存的登录信息
    val savedTenantCode: String = "",
    val savedUsername: String = "",
    val rememberMe: Boolean = false
)
