package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

/**
 * 登录请求模型
 */
data class LoginRequest(
    @SerializedName("tenantCode")
    val tenantCode: String,

    @SerializedName("username")
    val username: String,

    @SerializedName("password")
    val password: String
)

/**
 * 登录响应模型
 */
data class LoginResponse(
    @SerializedName("token")
    val token: String,

    @SerializedName("user")
    val user: LoginUserInfo
)

/**
 * 登录返回的用户信息（简化版）
 */
data class LoginUserInfo(
    @SerializedName("id")
    val id: String,

    @SerializedName("username")
    val username: String,

    @SerializedName("fullName")
    val fullName: String?,

    @SerializedName("email")
    val email: String?,

    @SerializedName("tenantId")
    val tenantId: String,

    @SerializedName("tenantCode")
    val tenantCode: String,

    @SerializedName("tenantName")
    val tenantName: String,

    @SerializedName("userType")
    val userType: String,

    @SerializedName("passwordExpired")
    val passwordExpired: Boolean
)

/**
 * 令牌登录请求模型（扫码登录）
 */
data class TokenLoginRequest(
    @SerializedName("token")
    val token: String
)

/**
 * PDA 登录二维码内容模型
 */
data class PdaLoginQrContent(
    @SerializedName("type")
    val type: String,

    @SerializedName("version")
    val version: Int,

    @SerializedName("token")
    val token: String
)
