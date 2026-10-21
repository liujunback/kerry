package com.kec.wms.pda.di

import com.kec.wms.pda.data.auth.AuthSessionManager
import com.kec.wms.pda.data.local.LoginPreferences
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * 认证拦截器
 * 自动在请求头中添加 Bearer token
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val loginPreferences: LoginPreferences,
    private val cookieManager: CookieManager,
    private val authSessionManager: AuthSessionManager
) : Interceptor {

    companion object {
        private const val TERMINAL_TYPE_HEADER = "X-WMS-Terminal-Type"
        private const val WAREHOUSE_ID_HEADER = "X-WMS-Warehouse-Id"
        private const val TERMINAL_TYPE_PDA = "PDA"
        private const val ERROR_BODY_PREVIEW_BYTES = 4096L

        private val AUTH_PATH_MARKERS = listOf(
            "/auth/login",
            "/auth/pda-token-login",
            "/auth/token-login"
        )

        private val SESSION_EXPIRED_MARKERS = listOf(
            "Invalid token",
            "Unauthorized",
            "未登录",
            "未授权",
            "登录令牌无效",
            "token"
        )
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // 获取保存的 token
        val token = loginPreferences.getToken()
        val warehouseId = loginPreferences.getWarehouseIdSync()

        // 如果没有 token 或者是登录请求，直接放行
        if (token == null || isAuthRequest(originalRequest.url.encodedPath)) {
            return chain.proceed(originalRequest)
        }

        // 添加 Authorization 头
        val builder = originalRequest.newBuilder()
            .header("Authorization", "Bearer $token")
            .header(TERMINAL_TYPE_HEADER, TERMINAL_TYPE_PDA)

        if (warehouseId.isNotBlank()) {
            builder.header(WAREHOUSE_ID_HEADER, warehouseId)
        }

        val newRequest = builder.build()

        val response = chain.proceed(newRequest)
        if (isSessionExpiredResponse(response)) {
            runBlocking {
                loginPreferences.clearToken()
            }
            cookieManager.clearCookies()
            authSessionManager.notifySessionExpired()
        }

        return response
    }

    private fun isAuthRequest(path: String): Boolean {
        return AUTH_PATH_MARKERS.any { marker ->
            path.contains(marker, ignoreCase = true)
        }
    }

    private fun isSessionExpiredResponse(response: Response): Boolean {
        if (response.code != 401) {
            return false
        }

        val bodyPreview = runCatching {
            response.peekBody(ERROR_BODY_PREVIEW_BYTES).string()
        }.getOrDefault("")

        if (bodyPreview.isBlank()) {
            return true
        }

        return SESSION_EXPIRED_MARKERS.any { marker ->
            bodyPreview.contains(marker, ignoreCase = true)
        }
    }
}
