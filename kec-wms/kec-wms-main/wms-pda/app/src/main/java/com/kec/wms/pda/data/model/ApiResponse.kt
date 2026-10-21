package com.kec.wms.pda.data.model

import com.google.gson.annotations.SerializedName

/**
 * 通用API响应包装类
 * 对应后端统一响应格式: { success: boolean, message?: string, error?: string, data: any }
 */
data class ApiResponse<T>(
    @SerializedName("success")
    val success: Boolean,

    @SerializedName("message")
    val message: String? = null,

    @SerializedName("error")
    val error: String? = null,

    @SerializedName("data")
    val data: T? = null,

    @SerializedName("code")
    val code: String? = null
)

/**
 * 扩展函数：将ApiResponse转换为Result
 */
fun <T> ApiResponse<T>.toResult(): Result<T> {
    return if (success && data != null) {
        Result.success(data)
    } else {
        val errorMessage = error ?: message ?: "未知错误"
        Result.failure(Exception(errorMessage))
    }
}
