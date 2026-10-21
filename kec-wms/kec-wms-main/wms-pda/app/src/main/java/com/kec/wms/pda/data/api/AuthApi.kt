package com.kec.wms.pda.data.api

import com.kec.wms.pda.data.model.ApiResponse
import com.kec.wms.pda.data.model.LoginRequest
import com.kec.wms.pda.data.model.LoginResponse
import com.kec.wms.pda.data.model.TokenLoginRequest
import com.kec.wms.pda.data.model.UserInfo
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

/**
 * PDA 认证 API 接口
 */
interface AuthApi {

    /**
     * PDA 用户名密码登录
     * POST /api/v1/auth/login
     */
    @POST(ApiPaths.Auth.LOGIN)
    suspend fun login(
        @Body request: LoginRequest
    ): ApiResponse<LoginResponse>

    /**
     * 获取当前 PDA 登录用户信息
     * GET /api/v1/auth/me
     */
    @GET(ApiPaths.Auth.CURRENT_USER)
    suspend fun getCurrentUser(): ApiResponse<UserInfo>

    /**
     * PDA 二维码令牌登录
     * POST /api/v1/auth/pda-token-login
     */
    @POST(ApiPaths.Auth.PDA_TOKEN_LOGIN)
    suspend fun tokenLogin(
        @Body request: TokenLoginRequest
    ): ApiResponse<LoginResponse>
}
