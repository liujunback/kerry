package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

/**
 * 用户信息模型
 * 对应后端 /api/v1/auth/me 接口返回的用户数据
 */
data class UserInfo(
    @SerializedName("id")
    val id: String,

    @SerializedName("username")
    val username: String,

    @SerializedName("fullName")
    val fullName: String?,

    @SerializedName("email")
    val email: String?,

    @SerializedName("phone")
    val phone: String?,

    @SerializedName("userType")
    val userType: String,

    @SerializedName("tenant")
    val tenant: TenantInfo,

    @SerializedName("permissions")
    val permissions: List<String>? = null,

    @SerializedName("warehouseBindings")
    val warehouseBindings: List<UserWarehouseBinding>? = null,

    @SerializedName("defaultWarehouseId")
    val defaultWarehouseId: String? = null
)

data class UserWarehouseBinding(
    @SerializedName("warehouseId")
    val warehouseId: String,

    @SerializedName("warehouseCode")
    val warehouseCode: String,

    @SerializedName("warehouseName")
    val warehouseName: String,

    @SerializedName("isDefault")
    val isDefault: Boolean
)

/**
 * 租户信息
 */
data class TenantInfo(
    @SerializedName("id")
    val id: String,

    @SerializedName("tenantCode")
    val tenantCode: String,

    @SerializedName("tenantName")
    val tenantName: String
)
