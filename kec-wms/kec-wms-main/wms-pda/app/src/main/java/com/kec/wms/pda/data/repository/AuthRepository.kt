package com.kec.wms.pda.data.repository

import android.util.Log
import com.kec.wms.pda.data.api.AuthApi
import com.kec.wms.pda.data.api.toApiException
import com.kec.wms.pda.data.local.LoginPreferences
import com.kec.wms.pda.data.local.SavedUserInfo
import com.kec.wms.pda.data.model.LoginRequest
import com.kec.wms.pda.data.model.LoginResponse
import com.kec.wms.pda.data.model.TokenLoginRequest
import com.kec.wms.pda.data.model.UserInfo
import com.kec.wms.pda.data.model.toResult
import com.kec.wms.pda.di.CookieManager
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 认证数据仓库
 * 负责处理登录、用户信息等认证相关操作
 */
@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val loginPreferences: LoginPreferences,
    private val cookieManager: CookieManager
) {

    /**
     * 登录
     * @param tenantCode 租户编码
     * @param username 用户名
     * @param password 密码
     * @return Result<LoginResponse> - 登录成功返回 token 和用户信息
     */
    suspend fun login(
        tenantCode: String,
        username: String,
        password: String
    ): Result<LoginResponse> {
        return try {
            Log.d("AuthRepository", "开始登录: tenantCode=$tenantCode, username=$username")
            Log.d("AuthRepository", "当前线程: ${Thread.currentThread().name}")

            val request = LoginRequest(tenantCode, username, password)
            Log.d("AuthRepository", "创建请求对象完成")

            Log.d("AuthRepository", "准备调用API...")
            val response = authApi.login(request)
            Log.d("AuthRepository", "API调用完成")
            Log.d("AuthRepository", "收到响应: success=${response.success}")

            val result = response.toResult()

            // 登录成功后保存 token
            if (result.isSuccess) {
                result.getOrNull()?.let { loginResponse ->
                    Log.d("AuthRepository", "登录成功，保存token")
                    loginPreferences.saveToken(loginResponse.token)
                    loginPreferences.saveUserInfo(
                        userId = loginResponse.user.id,
                        username = loginResponse.user.username,
                        fullName = loginResponse.user.fullName,
                        email = loginResponse.user.email,
                        tenantId = loginResponse.user.tenantId,
                        tenantCode = loginResponse.user.tenantCode,
                        tenantName = loginResponse.user.tenantName,
                        userType = loginResponse.user.userType
                    )
                    loginPreferences.saveWarehouseId(null)
                }
                // 登录成功后自动获取权限（失败不阻塞）
                fetchAndSavePermissions()
            } else {
                Log.e("AuthRepository", "登录失败: ${result.exceptionOrNull()?.message}")
            }

            result
        } catch (e: UnknownHostException) {
            Log.e("AuthRepository", "网络错误：无法连接到服务器", e)
            Result.failure(Exception("无法连接到服务器，请检查网络连接"))
        } catch (e: SocketTimeoutException) {
            Log.e("AuthRepository", "网络超时", e)
            Result.failure(Exception("网络请求超时，请稍后重试"))
        } catch (e: Exception) {
            Log.e("AuthRepository", "登录异常: ${e.javaClass.simpleName}", e)
            Result.failure(e.toApiException("登录失败"))
        }
    }

    /**
     * 获取当前用户信息
     * @return Result<UserInfo> - 用户信息
     */
    suspend fun getCurrentUser(): Result<UserInfo> {
        return try {
            val response = authApi.getCurrentUser()
            response.toResult()
        } catch (e: Exception) {
            Result.failure(e.toApiException("获取用户信息失败"))
        }
    }

    /**
     * 登出
     */
    suspend fun logout() {
        loginPreferences.clearToken()
        cookieManager.clearCookies()
    }

    /**
     * 获取保存的 token
     */
    fun getToken(): String? {
        return loginPreferences.getToken()
    }

    /**
     * 检查是否已登录
     */
    fun isLoggedIn(): Boolean {
        return loginPreferences.getToken() != null
    }

    /**
     * 令牌登录（扫码登录）
     * @param token 从二维码获取的登录令牌
     * @return Result<LoginResponse> - 登录成功返回 token 和用户信息
     */
    suspend fun tokenLogin(token: String): Result<LoginResponse> {
        return try {
            Log.d("AuthRepository", "开始令牌登录")

            val request = TokenLoginRequest(token)
            val response = authApi.tokenLogin(request)

            Log.d("AuthRepository", "令牌登录响应: success=${response.success}")

            val result = response.toResult()

            // 登录成功后保存 token
            if (result.isSuccess) {
                result.getOrNull()?.let { loginResponse ->
                    Log.d("AuthRepository", "令牌登录成功，保存token")
                    loginPreferences.saveToken(loginResponse.token)
                    loginPreferences.saveUserInfo(
                        userId = loginResponse.user.id,
                        username = loginResponse.user.username,
                        fullName = loginResponse.user.fullName,
                        email = loginResponse.user.email,
                        tenantId = loginResponse.user.tenantId,
                        tenantCode = loginResponse.user.tenantCode,
                        tenantName = loginResponse.user.tenantName,
                        userType = loginResponse.user.userType
                    )
                    loginPreferences.saveWarehouseId(null)
                }
                // 登录成功后自动获取权限（失败不阻塞）
                fetchAndSavePermissions()
            } else {
                Log.e("AuthRepository", "令牌登录失败: ${result.exceptionOrNull()?.message}")
            }

            result
        } catch (e: UnknownHostException) {
            Log.e("AuthRepository", "网络错误：无法连接到服务器", e)
            Result.failure(Exception("无法连接到服务器，请检查网络连接"))
        } catch (e: SocketTimeoutException) {
            Log.e("AuthRepository", "网络超时", e)
            Result.failure(Exception("网络请求超时，请稍后重试"))
        } catch (e: Exception) {
            Log.e("AuthRepository", "令牌登录异常: ${e.javaClass.simpleName}", e)
            Result.failure(e.toApiException("登录失败"))
        }
    }

    /**
     * 获取并保存用户权限
     * 调用 /api/v1/auth/me 获取用户信息，提取 permissions 存入 DataStore
     * 失败不抛出异常，仅记录日志
     */
    suspend fun fetchAndSavePermissions() {
        try {
            val result = getCurrentUser()
            if (result.isSuccess) {
                val userInfo = result.getOrNull()
                val permissions = userInfo?.permissions ?: emptyList()
                userInfo?.let {
                loginPreferences.saveUserInfo(
                    userId = it.id,
                    username = it.username,
                    fullName = it.fullName,
                    email = it.email,
                        tenantId = it.tenant.id,
                        tenantCode = it.tenant.tenantCode,
                        tenantName = it.tenant.tenantName,
                        userType = it.userType
                    )
                }
                val warehouseBindings = userInfo?.warehouseBindings.orEmpty()
                val savedWarehouseId = loginPreferences.getWarehouseIdSync()
                val nextWarehouseId = when {
                    savedWarehouseId.isNotBlank() &&
                        warehouseBindings.any { binding -> binding.warehouseId == savedWarehouseId } -> {
                        savedWarehouseId
                    }
                    warehouseBindings.size == 1 -> warehouseBindings.first().warehouseId
                    else -> null
                }
                loginPreferences.saveWarehouseId(nextWarehouseId)
                loginPreferences.savePermissions(permissions)
                Log.d("AuthRepository", "权限保存成功: $permissions")
            } else {
                Log.w("AuthRepository", "获取权限失败: ${result.exceptionOrNull()?.message}")
            }
        } catch (e: Exception) {
            Log.w("AuthRepository", "获取权限异常，不阻塞登录: ${e.message}")
        }
    }

    /**
     * 获取本地缓存的权限列表
     */
    fun getPermissions(): List<String> {
        return loginPreferences.getPermissionsSync()
    }

    fun getSavedUserInfo(): SavedUserInfo? {
        return loginPreferences.getSavedUserInfo()
    }

    suspend fun saveWarehouseId(warehouseId: String?) {
        loginPreferences.saveWarehouseId(warehouseId)
    }

    fun getWarehouseId(): String {
        return loginPreferences.getWarehouseIdSync()
    }
}
